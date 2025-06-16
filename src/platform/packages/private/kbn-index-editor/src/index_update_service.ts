/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataTableRecord, buildDataTableRecord } from '@kbn/discover-utils';
import type { Filter } from '@kbn/es-query';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  combineLatest,
  debounceTime,
  filter,
  from,
  map,
  of,
  scan,
  shareReplay,
  skipWhile,
  startWith,
  switchMap,
  takeUntil,
  takeWhile,
  tap,
  timer,
  withLatestFrom,
} from 'rxjs';

const BUFFER_TIMEOUT_MS = 5000; // 5 seconds

const UNDO_EMIT_MS = 500; // 0.5 seconds

interface DocUpdate {
  id?: string;
  value: Record<string, any>;
}

type Action = { type: 'add'; payload: DocUpdate } | { type: 'undo' };

export type PendingSave = Map<DocUpdate['id'], DocUpdate['value']>;

export class IndexUpdateService {
  constructor(private readonly http: HttpStart, private readonly data: DataPublicPluginStart) {
    this.listenForUpdates();
  }

  private indexName: string | null = null;

  private indexName$ = new Subject<string | null>();

  private readonly scheduledUpdates$ = new BehaviorSubject<DocUpdate[]>([]);

  private readonly undoChangeSubject$ = new Subject<number>();

  private readonly actions$ = new Subject<Action>();

  /** ES Documents */
  private readonly _rows$ = new BehaviorSubject<DataTableRecord[]>([]);
  public readonly rows$: Observable<DataTableRecord[]> = this._rows$.asObservable();

  private readonly _subscription = new Subscription();

  // Accumulate updates in buffer with undo
  private bufferState$: Observable<DocUpdate[]> = this.actions$.pipe(
    scan((acc: DocUpdate[], action: Action) => {
      if (action.type === 'add') {
        return [...acc, action.payload];
      } else if (action.type === 'undo') {
        return acc.slice(0, -1); // remove last
      } else {
        return acc;
      }
    }, []),
    shareReplay(1) // keep latest buffer for retries
  );

  /** Docs that are currently being saved */
  public readonly savingDocs$: Observable<PendingSave> = this.bufferState$.pipe(
    map((updates) => {
      return updates.reduce((acc, update) => {
        if (update.id) {
          acc.set(update.id, update.value);
        }
        return acc;
      }, new Map() as PendingSave);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Observable to track the number of milliseconds left to allow undo of the last change
  public readonly undoTimer$: Observable<number> = this.actions$.pipe(
    filter((action) => action.type === 'add' || action.type === 'undo'),
    switchMap((action) =>
      action.type === 'add'
        ? timer(0, UNDO_EMIT_MS).pipe(
            map((elapsed) => {
              return Math.max(BUFFER_TIMEOUT_MS - elapsed * UNDO_EMIT_MS, 0);
            }),
            takeUntil(this.actions$.pipe(filter((a) => a.type === 'undo'))),
            takeWhile((remaining) => remaining > 0, true)
          )
        : of(0)
    )
  );

  public readonly dataView$: Observable<DataView> = this.indexName$.pipe(
    skipWhile((indexName) => !indexName),
    switchMap((indexName) => {
      return from(this.getDataView(indexName!));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /**
   * Finds an existing data view or creates a new one based on the index name.
   * Ad-hoc data view should only be created if the index has been saved.
   */
  private async getDataView(indexName: string): Promise<DataView> {
    if (!indexName) {
      throw new Error('Index name is not set');
    }

    const dataView: DataView | undefined = (await this.data.dataViews.find(indexName, 1))[0];

    if (dataView) {
      return dataView;
    }

    return await this.data.dataViews.create({ title: indexName, name: indexName });
  }

  private listenForUpdates() {
    this._subscription.add(
      this.bufferState$
        .pipe(
          debounceTime(BUFFER_TIMEOUT_MS),
          filter((updates) => updates.length > 0),
          switchMap((updates) => {
            return from(
              // TODO create an API endpoint for bulk updates
              this.http.post(`/api/console/proxy`, {
                query: {
                  path: `/${this.indexName}/_bulk`,
                  method: 'POST',
                },
                body:
                  updates
                    .map((update) => {
                      if (update.id) {
                        return `{"update": {"_id": "${update.id}"}}\n${JSON.stringify({
                          doc: update.value,
                        })}`;
                      }
                      return `{"index": {}}\n${JSON.stringify(update.value)}`;
                    })
                    .join('\n') + '\n', // NDJSON format requires a newline at the end
                headers: {
                  'Content-Type': 'application/x-ndjson',
                },
              })
            );
          })
        )
        .subscribe({
          next: (response) => {
            console.log('API response:', response);
          },
          error: (err) => {
            // TODO handle API errors
            console.error('API error:', err);
          },
        })
    );

    this._subscription.add(
      combineLatest([
        this.dataView$,
        // Time range updates
        this.data.query.timefilter.timefilter.getTimeUpdate$().pipe(startWith(null)),
      ])
        .pipe(
          switchMap(([dataView, timeRangeEmit]) => {
            return from(
              this.data.search.searchSource.create({
                // index: this.indexName!,
                index: dataView.toSpec(),
                size: 1000, // Adjust size as needed
              })
            ).pipe(
              tap((searchSource) => {
                const timeRangeFilter = this.data.query.timefilter.timefilter.createFilter(
                  dataView,
                  this.data.query.timefilter.timefilter.getTime()
                ) as Filter;
                searchSource.setField('filter', [timeRangeFilter]);
              })
            );
          }),
          switchMap((searchSource) => {
            // Set the query to match all documents
            return searchSource.fetch$({
              disableWarningToasts: true,
            });
          }),
          withLatestFrom(this.dataView$)
        )
        .subscribe({
          next: ([response, dataView]) => {
            const { hits, total } = response.rawResponse.hits;

            const resultRows: DataTableRecord[] = hits.map((hit) => {
              return buildDataTableRecord(hit, dataView);
            });

            this._rows$.next(resultRows);
          },
          error: (error) => {
            // setIsFetching(false);
          },
        })
    );
  }

  public setIndexName(indexName: string) {
    if (false) {
      // TODO check if index is already created
      throw new Error(`Index with name ${indexName} already exists.`);
    }
    this.indexName$.next(indexName);
    this.indexName = indexName;
  }

  // Add a new index
  public addDoc(doc: Record<string, any>) {
    this.actions$.next({ type: 'add', payload: { value: doc } });
  }

  /* Partial doc update */
  public updateDoc(id: string, update: Record<string, any>) {
    this.actions$.next({ type: 'add', payload: { id, value: update } });
  }

  /**
   * Cancel the latest update operation.
   */
  public undo() {
    this.actions$.next({ type: 'undo' });
  }

  public destroy() {
    this._subscription.unsubscribe();
    this.scheduledUpdates$.complete();
    this.undoChangeSubject$.complete();
  }
}
