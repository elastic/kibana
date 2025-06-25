/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BulkRequest,
  BulkResponse,
  BulkResponseItem,
} from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart } from '@kbn/core/public';
import { DataPublicPluginStart, KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataTableRecord, buildDataTableRecord } from '@kbn/discover-utils';
import type { Filter } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
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

type Action =
  | { type: 'add'; payload: DocUpdate }
  | { type: 'undo' }
  | { type: 'saved'; payload: any };

export type PendingSave = Map<DocUpdate['id'], DocUpdate['value']>;

export class IndexUpdateService {
  constructor(private readonly http: HttpStart, private readonly data: DataPublicPluginStart) {
    this.listenForUpdates();
  }

  private _indexName$ = new BehaviorSubject<string | null>(null);
  public readonly indexName$: Observable<string | null> = this._indexName$.asObservable();

  // Indicated if the index exists (has been created) in Elasticsearch.
  private _indexCrated$ = new BehaviorSubject<boolean>(false);
  public readonly indexCreated$: Observable<boolean> = this._indexCrated$.asObservable();

  public setIndexCreated(created: boolean) {
    this._indexCrated$.next(created);
  }
  public getIndexCreated(): boolean {
    return this._indexCrated$.getValue();
  }

  private readonly actions$ = new Subject<Action>();

  private readonly _isSaving$ = new BehaviorSubject<boolean>(false);
  public readonly isSaving$: Observable<boolean> = this._isSaving$.asObservable();

  private readonly _isFetching$ = new BehaviorSubject<boolean>(false);
  public readonly isFetching$: Observable<boolean> = this._isSaving$.asObservable();

  private readonly _exitAttemptWithUnsavedFields$ = new BehaviorSubject<boolean>(false);
  public readonly exitAttemptWithUnsavedFields$ =
    this._exitAttemptWithUnsavedFields$.asObservable();

  /** ES Documents */
  private readonly _rows$ = new BehaviorSubject<DataTableRecord[]>([]);
  public readonly rows$: Observable<DataTableRecord[]> = this._rows$.asObservable();

  // Holds runtime field definitions reactively
  private _pendingFieldsToBeSaved = new BehaviorSubject<string[]>([]);
  public readonly pendingFieldsToBeSaved$: Observable<any[]> =
    this._pendingFieldsToBeSaved.asObservable();

  private readonly _subscription = new Subscription();

  // Accumulate updates in buffer with undo
  private bufferState$: Observable<DocUpdate[]> = this.actions$.pipe(
    scan((acc: DocUpdate[], action: Action) => {
      if (action.type === 'add') {
        return [...acc, action.payload];
      } else if (action.type === 'undo') {
        return acc.slice(0, -1); // remove last
      } else if (action.type === 'saved') {
        // Clear the buffer after save
        // TODO check for update response
        return [];
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

  public readonly dataView$: Observable<DataView> = combineLatest([
    this._indexName$,
    this._indexCrated$,
  ]).pipe(
    skipWhile(([indexName, indexCreated]) => {
      return !indexName;
    }),
    switchMap(([indexName]) => {
      return from(this.getDataView(indexName!));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly dataTableColumns$: Observable<DatatableColumn[]> = combineLatest([
    this.dataView$,
    this.pendingFieldsToBeSaved$,
  ]).pipe(
    map(([dataView, pendingFieldsToBeSaved]) => {
      for (const field of pendingFieldsToBeSaved) {
        dataView.fields.add({
          name: field,
          type: KBN_FIELD_TYPES.UNKNOWN,
          aggregatable: true,
          searchable: true,
        });
      }
      return (
        dataView.fields
          // Exclude metadata fields. TODO check if this is the right way to do it
          // @ts-ignore
          .filter((field) => field.spec.metadata_field !== true && !field.spec.subType)
          .map((field) => {
            return {
              name: field.name,
              id: field.name,
              isNull: field.isNull,
              meta: {
                type: field.type,
                params: {
                  id: field.name,
                  sourceParams: {
                    fieldName: field.name,
                  },
                },
                aggregatable: field.aggregatable,
                searchable: field.searchable,
                esTypes: field.esTypes,
              },
            } as DatatableColumn;
          })
      );
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

    return await this.data.dataViews.create({
      title: indexName,
      name: indexName,
      // The index might not exist yet
      allowNoIndex: true,
    });
  }

  private listenForUpdates() {
    // Queue for bulk updates
    this._subscription.add(
      this.bufferState$
        .pipe(
          tap(() => {
            this._isSaving$.next(true);
          }),
          debounceTime(BUFFER_TIMEOUT_MS),
          filter((updates) => updates.length > 0),
          switchMap((updates) => {
            return from(this.bulkUpdate(updates)).pipe(
              withLatestFrom(this._rows$, this.dataView$),
              map(([response, rows, dataView]) => {
                return { updates, response, rows, dataView };
              })
            );
          })
        )
        .subscribe({
          next: ({ updates, response, rows, dataView }) => {
            // //HD bulk update can be a problem
            // Updates the pending fields to be saved
            const unsavedColumns = this._pendingFieldsToBeSaved.value.filter((pendingField) => {
              // Remove fields that were saved
              return !updates.some((update) => update.value[pendingField] !== undefined);
            });

            this._pendingFieldsToBeSaved.next(unsavedColumns);

            // Clear the buffer after successful update
            this.actions$.next({ type: 'saved', payload: response });

            // Clear pending fields after save
            this._pendingFieldsToBeSaved.next([]);

            // TODO do we need to re-fetch docs using _mget, in order to retrieve a full doc update?

            const mappedResponse = response.items.reduce((acc, item, index) => {
              // Updates that were successful
              const updateItem = Object.values(item)[0] as BulkResponseItem;
              const updateValue = updates[index].value;
              if (updateItem.status === 200 && updateItem._id) {
                const docId = updateItem._id;
                const e = acc.get(docId) ?? {};
                acc.set(docId, { ...e, ...updateValue });
              }
              return acc;
            }, new Map<string, any>());

            this._rows$.next(
              rows.map((row) => {
                const docId = row.raw._id;
                const mergedSource = { ...row.raw._source, ...(mappedResponse.get(docId!) ?? {}) };

                return buildDataTableRecord(
                  {
                    ...row.raw,
                    _source: mergedSource,
                  },
                  dataView
                );
              })
            );

            this._isSaving$.next(false);

            // TODO handle index docs
          },
          error: (err) => {
            // TODO handle API errors

            this._isSaving$.next(false);
          },
        })
    );

    // Fetch ES docs
    this._subscription.add(
      combineLatest([
        this.dataView$,
        // Time range updates
        this.data.query.timefilter.timefilter.getTimeUpdate$().pipe(startWith(null)),
      ])
        .pipe(
          tap(() => {
            this._isFetching$.next(true);
          }),
          switchMap(([dataView, timeRangeEmit]) => {
            return from(
              this.data.search.searchSource.create({
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
            const { hits } = response.rawResponse.hits;

            const resultRows: DataTableRecord[] = hits.map((hit) => {
              return buildDataTableRecord(hit, dataView);
            });

            this._rows$.next(resultRows);
            this._isFetching$.next(false);
          },
          error: (error) => {
            this._isFetching$.next(false);
          },
        })
    );
  }

  public setIndexName(indexName: string) {
    this._indexName$.next(indexName);
  }

  public getIndexName(): string | null {
    return this._indexName$.getValue();
  }

  public getPendingFieldsToBeSaved(): string[] {
    return this._pendingFieldsToBeSaved.getValue();
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
   * Saves documents immediately to the index.
   * @param updates
   */
  public bulkUpdate(updates: DocUpdate[]): Promise<BulkResponse> {
    const body = JSON.stringify({
      operations: (
        updates.map((update) => {
          if (update.id) {
            return [
              {
                update: { _id: update.id },
              },
              {
                doc: update.value,
              },
            ];
          }
          return [
            {
              index: {},
            },
            update.value,
          ];
        }) as BulkRequest['operations']
      )?.flat(),
    });

    return this.http.post<BulkResponse>(
      `/internal/esql/lookup_index/${this.getIndexName()}/update`,
      {
        body,
      }
    );
  }

  /**
   * Cancel the latest update operation.
   */
  public undo() {
    this.actions$.next({ type: 'undo' });
  }

  public addNewField(filedName: string) {
    const current = this._pendingFieldsToBeSaved.getValue();
    this._pendingFieldsToBeSaved.next([...current, filedName]);
  }

  public setExitAttemptWithUnsavedFields(value: boolean) {
    this._exitAttemptWithUnsavedFields$.next(value);
  }

  public deleteUnsavedFields() {
    this._pendingFieldsToBeSaved.next([]);
  }

  public destroy() {
    this._subscription.unsubscribe();
  }
}
