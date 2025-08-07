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
import { type DataPublicPluginStart, KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataTableRecord, buildDataTableRecord } from '@kbn/discover-utils';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { groupBy, times, zipObject } from 'lodash';
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
  takeWhile,
  tap,
  timer,
  withLatestFrom,
  firstValueFrom,
  catchError,
} from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Builder, BasicPrettyPrinter } from '@kbn/esql-ast';
import { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { parsePrimitive, isPlaceholderColumn } from './utils';
import { ROW_PLACEHOLDER_PREFIX, COLUMN_PLACEHOLDER_PREFIX } from './constants';
const BUFFER_TIMEOUT_MS = 5000; // 5 seconds

const UNDO_EMIT_MS = 500; // 0.5 seconds

const DOCS_PER_FETCH = 1000;

const MAX_COLUMN_PLACEHOLDERS = 4;

interface DocUpdate {
  id?: string;
  value: Record<string, any>;
}

interface ColumnAddition {
  name: string;
}

interface ColumnUpdate {
  name: string;
  previousName?: string;
}

type Action =
  | { type: 'add'; payload: DocUpdate }
  | { type: 'undo' }
  | { type: 'saved'; payload: { response: any; updates: DocUpdate[] } }
  | { type: 'add-column' }
  | { type: 'edit-column'; payload: ColumnUpdate }
  | { type: 'delete-column'; payload: ColumnUpdate }
  | { type: 'discard-unsaved-columns' }
  | { type: 'discard-unsaved-values' }
  | { type: 'new-row-added'; payload: Record<string, any> };

export type PendingSave = Map<DocUpdate['id'], DocUpdate['value']>;

export class IndexUpdateService {
  constructor(private readonly http: HttpStart, private readonly data: DataPublicPluginStart) {
    this.listenForUpdates();
  }

  private _indexName$ = new BehaviorSubject<string | null>(null);
  public readonly indexName$: Observable<string | null> = this._indexName$.asObservable();

  private readonly _qstr$ = new BehaviorSubject<string>('');
  public readonly qstr$: Observable<string> = this._qstr$.asObservable();
  public setQstr(queryString: string) {
    this._qstr$.next(queryString);
  }

  // Indicated if the index exists (has been created) in Elasticsearch.
  private _indexCrated$ = new BehaviorSubject<boolean>(false);
  public readonly indexCreated$: Observable<boolean> = this._indexCrated$.asObservable();

  public setIndexCreated(created: boolean) {
    this._indexCrated$.next(created);
  }
  public isIndexCreated(): boolean {
    return this._indexCrated$.getValue();
  }

  private readonly _actions$ = new Subject<Action>();

  private readonly _isSaving$ = new BehaviorSubject<boolean>(false);
  public readonly isSaving$: Observable<boolean> = this._isSaving$.asObservable();

  private readonly _isFetching$ = new BehaviorSubject<boolean>(false);
  public readonly isFetching$: Observable<boolean> = this._isFetching$.asObservable();

  private readonly _exitAttemptWithUnsavedFields$ = new BehaviorSubject<boolean>(false);
  public readonly exitAttemptWithUnsavedFields$ =
    this._exitAttemptWithUnsavedFields$.asObservable();

  /** ES Documents */
  private readonly _rows$ = new BehaviorSubject<DataTableRecord[]>([this.buildPlaceholderRow()]);
  public readonly rows$: Observable<DataTableRecord[]> = this._rows$.asObservable();

  private _pendingColumnsToBeSaved$ = new BehaviorSubject<ColumnAddition[]>([]);
  public readonly pendingColumnsToBeSaved$ = this._pendingColumnsToBeSaved$.asObservable();

  private readonly _totalHits$ = new BehaviorSubject<number>(0);
  public readonly totalHits$: Observable<number> = this._totalHits$.asObservable();

  private readonly _refreshSubject$ = new BehaviorSubject<number>(0);

  private readonly _subscription = new Subscription();

  public readonly esqlQuery$: Observable<string> = combineLatest([
    this._indexCrated$,
    this._indexName$,
    this._qstr$,
  ]).pipe(
    skipWhile(([indexCreated, indexName]) => !indexCreated || !indexName),
    map(([indexCreated, indexName, qstr]) => {
      return this._buildESQLQuery(indexName, qstr, true);
    })
  );

  public readonly esqlDiscoverQuery$: Observable<string | undefined> = combineLatest([
    this._indexName$,
    this._qstr$,
  ]).pipe(
    map(([indexName, qstr]) => {
      if (indexName) {
        return this._buildESQLQuery(indexName, qstr, false);
      }
    })
  );

  private _buildESQLQuery(
    indexName: string | null,
    qstr: string | null,
    includeMetadata: boolean
  ): string {
    // FROM
    const fromCmd = Builder.command({
      name: 'from',
      args: [Builder.expression.source.node(indexName!)],
    });

    // METADATA _id
    if (includeMetadata) {
      fromCmd.args.push(
        Builder.option({
          name: 'metadata',
          args: [Builder.expression.column({ args: [Builder.identifier({ name: '_id' })] })],
        })
      );
    }

    // WHERE qstr("message: …")
    const whereCmd = Builder.command({
      name: 'where',
      args: [Builder.expression.func.call('qstr', [Builder.expression.literal.string(qstr)])],
    });

    // LIMIT 10
    const limitCmd = Builder.command({
      name: 'limit',
      args: [Builder.expression.literal.integer(DOCS_PER_FETCH)],
    });
    // Combine the commands into a query node
    const queryExpression = Builder.expression.query([
      fromCmd,
      ...(qstr ? [whereCmd] : []),
      limitCmd,
    ]);
    const queryText: string = BasicPrettyPrinter.print(queryExpression);

    return queryText;
  }

  // Accumulate updates in buffer with undo
  private bufferState$: Observable<DocUpdate[]> = this._actions$.pipe(
    scan((acc: DocUpdate[], action: Action) => {
      switch (action.type) {
        case 'add':
          return [...acc, action.payload];
        case 'undo':
          return acc.slice(0, -1); // remove last
        case 'saved':
          // Clear the buffer after save
          // TODO check for update response
          return [];
        case 'discard-unsaved-values':
          return [];
        case 'edit-column':
          // if a column name has changed, we need to update the values added with the previous name.
          return acc.map((docUpdate) => {
            if (action.payload.previousName && docUpdate.value[action.payload.previousName]) {
              const newValue = {
                ...docUpdate.value,
                [action.payload.name]: docUpdate.value[action.payload.previousName],
              };
              delete newValue[action.payload.previousName];
              return { ...docUpdate, value: newValue };
            }
            return docUpdate;
          });
        case 'delete-column':
          // if a column has been deleted, we need to delete the values added to it.
          return acc.filter((docUpdate) => {
            return !docUpdate.value[action.payload.name];
          });
        default:
          return acc;
      }
    }, []),
    shareReplay(1) // keep latest buffer for retries
  );

  /** Docs that are pending to be saved*/
  public readonly savingDocs$: Observable<PendingSave> = this.bufferState$.pipe(
    map((updates) => {
      return updates.reduce((acc, update) => {
        if (update.id) {
          acc.set(update.id, {
            ...acc.get(update.id),
            ...update.value,
          });
        }
        return acc;
      }, new Map() as PendingSave);
    }),
    startWith(new Map() as PendingSave),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Observable to track the number of milliseconds left to allow undo of the last change
  public readonly undoTimer$: Observable<number> = this.bufferState$.pipe(
    skipWhile(() => !this.isIndexCreated()),
    switchMap((updates) =>
      updates.length > 0
        ? timer(0, UNDO_EMIT_MS).pipe(
            map((elapsed) => Math.max(BUFFER_TIMEOUT_MS - elapsed * UNDO_EMIT_MS, 0)),
            takeWhile((remaining) => remaining > 0, true)
          )
        : of(0)
    )
  );

  public readonly dataView$: Observable<DataView> = combineLatest([
    this._indexName$,
    this._indexCrated$,
    this.pendingColumnsToBeSaved$.pipe(
      // Refetch the dataView to look for new field types when there are new columns saved
      // (when pendingColumnsToBeSaved$ length decreases)
      scan(
        (acc, curr) => ({
          prevLength: acc.currLength,
          currLength: curr.length,
        }),
        { prevLength: 0, currLength: 0 }
      ),
      filter(({ prevLength, currLength }) => currLength < prevLength),
      startWith({ prevLength: 0, currLength: 0 })
    ),
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
    this.pendingColumnsToBeSaved$.pipe(startWith([])),
  ]).pipe(
    map(([dataView, pendingColumnsToBeSaved]) => {
      const unsavedFields = pendingColumnsToBeSaved
        .filter((column) => !dataView.fields.getByName(column.name))
        .map((column) => {
          return dataView.fields.create({
            name: column.name,
            type: KBN_FIELD_TYPES.UNKNOWN,
            aggregatable: true,
            searchable: true,
          });
        });

      return (
        dataView.fields
          .concat(unsavedFields)
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
      id: indexName,
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
          skipWhile(() => !this.isIndexCreated()),
          tap((updates) => {
            this._isSaving$.next(updates.length > 0);
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

            // Clear the buffer after successful update
            this._actions$.next({ type: 'saved', payload: { response, updates } });

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
        // Time range updates
        this.data.query.timefilter.timefilter.getTimeUpdate$().pipe(
          startWith(null),
          map(() => {
            return this.data.query.timefilter.timefilter.getTime();
          })
        ),
        // Query updates
        this.esqlQuery$,
        this._refreshSubject$,
      ])
        .pipe(
          skipWhile(() => !this.isIndexCreated()),
          tap(() => {
            this._isFetching$.next(true);
          }),
          switchMap(([timeRange, esqlQuery]) => {
            return this.data.search
              .search<{ params: ESQLSearchParams }, { rawResponse: ESQLSearchResponse }>(
                {
                  params: {
                    query: esqlQuery,
                  },
                },
                {
                  strategy: 'esql_async',
                  retrieveResults: true,
                }
              )
              .pipe(
                catchError((e) => {
                  // query might be invalid, so we return an empty response
                  return of({
                    rawResponse: {
                      columns: [],
                      values: [],
                      documents_found: 0,
                    } satisfies ESQLSearchResponse,
                  });
                })
              );
          })
        )
        .subscribe({
          next: (response) => {
            const { documents_found: total, values, columns } = response.rawResponse;

            const columnNames = columns.map(({ name }) => name);
            const resultRows: DataTableRecord[] = values
              .map((row) => zipObject(columnNames, row))
              .map((row, idx: number) => {
                return {
                  id: String(idx),
                  raw: row,
                  flattened: row,
                } as unknown as DataTableRecord;
              });

            this._rows$.next(resultRows);
            this._totalHits$.next(total ?? 0);
            this._isFetching$.next(false);
          },
          error: (error) => {
            this._isFetching$.next(false);
          },
        })
    );

    // Subscribe to pendingColumnsToBeSaved$ and update _pendingColumnsToBeSaved$
    this._subscription.add(
      this.dataView$
        .pipe(
          switchMap((dataView) => {
            let placeholderIndex = 0;
            const columnsCount = dataView.fields.filter(
              // @ts-ignore
              (field) => field.spec.metadata_field !== true && !field.spec.subType
            ).length;

            const missingPlaceholders = MAX_COLUMN_PLACEHOLDERS - columnsCount;
            const initialPlaceholders =
              missingPlaceholders > 0
                ? times(missingPlaceholders, () => ({
                    name: `${COLUMN_PLACEHOLDER_PREFIX}${placeholderIndex++}`,
                  }))
                : [];

            return this._actions$.pipe(
              scan((acc: ColumnAddition[], action) => {
                if (action.type === 'add-column') {
                  return [...acc, { name: `${COLUMN_PLACEHOLDER_PREFIX}${placeholderIndex++}` }];
                }
                if (action.type === 'edit-column') {
                  return acc.map((column) =>
                    column.name === action.payload.previousName
                      ? { ...column, name: action.payload.name }
                      : column
                  );
                }
                if (action.type === 'delete-column') {
                  return acc.filter((column) => column.name !== action.payload.name);
                }
                if (action.type === 'saved') {
                  // Filter out columns that were saved with a value.
                  return acc.filter((column) =>
                    action.payload.updates.every(
                      (update) => update.value[column.name] === undefined
                    )
                  );
                }
                if (action.type === 'new-row-added') {
                  // Filter out columns that were populated when adding a new row
                  return acc.filter((column) => action.payload[column.name] === undefined);
                }
                if (action.type === 'discard-unsaved-columns') {
                  return acc.filter((column) => isPlaceholderColumn(column.name));
                }
                return acc;
              }, initialPlaceholders),
              startWith(initialPlaceholders)
            );
          })
        )
        .subscribe(this._pendingColumnsToBeSaved$)
    );
  }

  private buildPlaceholderRow(): DataTableRecord {
    return buildDataTableRecord({
      _id: `${ROW_PLACEHOLDER_PREFIX}${uuidv4()}`,
    });
  }

  public refresh() {
    this._isFetching$.next(true);
    this._refreshSubject$.next(Date.now());
  }

  public setIsFetching(isFetching: boolean) {
    this._isFetching$.next(isFetching);
  }

  public setIndexName(indexName: string) {
    this._indexName$.next(indexName);
  }

  public getIndexName(): string | null {
    return this._indexName$.getValue();
  }

  public addEmptyRow() {
    this._rows$.next([this.buildPlaceholderRow(), ...this._rows$.getValue()]);
  }

  /* Partial doc update */
  public updateDoc(id: string, update: Record<string, unknown>) {
    const parsedUpdate = Object.entries(update).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        acc[key] = parsePrimitive(value);
        return acc;
      },
      {}
    );
    this._actions$.next({ type: 'add', payload: { id, value: parsedUpdate } });
  }

  /**
   * Saves documents immediately to the index.
   * @param updates
   */
  public bulkUpdate(updates: DocUpdate[]): Promise<BulkResponse> {
    const groupedOperations = groupBy(updates, (update) =>
      update.id && !update.id.startsWith(ROW_PLACEHOLDER_PREFIX) ? 'updates' : 'newDocs'
    );

    const updateOperations =
      groupedOperations?.updates?.map((update) => [
        { update: { _id: update.id } },
        { doc: update.value },
      ]) || [];

    const newDocs =
      groupedOperations?.newDocs?.reduce<Record<string, Record<string, any>>>((acc, update) => {
        const docId = update.id || 'new-row';
        acc[docId] = { ...acc[docId], ...update.value };
        return acc;
      }, {}) || {};

    const newDocOperations = Object.entries(newDocs).map(([id, doc]) => {
      return [{ index: {} }, doc];
    });

    const operations: BulkRequest['operations'] = [...updateOperations, ...newDocOperations];

    const body = JSON.stringify({
      operations: operations.flat(),
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
    this._actions$.next({ type: 'undo' });
  }

  public addNewColumn() {
    this._actions$.next({ type: 'add-column' });
  }

  public editColumn(name: string, previousName: string) {
    this._actions$.next({ type: 'edit-column', payload: { name, previousName } });
  }

  public deleteColumn(name: string) {
    this._actions$.next({ type: 'delete-column', payload: { name } });
  }

  public setExitAttemptWithUnsavedFields(value: boolean) {
    this._exitAttemptWithUnsavedFields$.next(value);
  }

  public discardUnsavedColumns() {
    this._actions$.next({ type: 'discard-unsaved-columns' });
  }

  public discardUnsavedChanges() {
    this._actions$.next({ type: 'discard-unsaved-values' });
  }

  public destroy() {
    this._subscription.unsubscribe();
    // complete all subjects
    this._isSaving$.complete();
    this._isFetching$.complete();
    this._rows$.complete();
    this._totalHits$.complete();
    this._actions$.complete();
    this._pendingColumnsToBeSaved$.complete();
    this._indexCrated$.complete();
    this._qstr$.complete();
    this._refreshSubject$.complete();
    this._exitAttemptWithUnsavedFields$.complete();

    const indexName = this.getIndexName();
    if (indexName) {
      this.data.dataViews.clearInstanceCache(indexName);
    }
    this._indexName$.complete();
  }

  public async createIndex() {
    try {
      this._isSaving$.next(true);

      const updates = await firstValueFrom(this.bufferState$);

      await this.http.post(`/internal/esql/lookup_index/${this.getIndexName()}`);
      await this.bulkUpdate(updates);

      this.setIndexCreated(true);
      this._actions$.next({ type: 'discard-unsaved-columns' });
    } catch (error) {
      throw error;
    } finally {
      this._isSaving$.next(false);
    }
  }
}
