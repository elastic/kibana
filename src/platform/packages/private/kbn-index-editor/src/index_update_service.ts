/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { type DataPublicPluginStart, KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DatatableColumn, DatatableColumnType } from '@kbn/expressions-plugin/common';
import { groupBy, times, zipObject } from 'lodash';
import {
  BehaviorSubject,
  type Observable,
  Subject,
  Subscription,
  combineLatest,
  filter,
  firstValueFrom,
  from,
  map,
  of,
  scan,
  shareReplay,
  skipWhile,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
  catchError,
  exhaustMap,
  asyncScheduler,
  first,
} from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { SortOrder } from '@kbn/unified-data-table';
import { esql } from '@kbn/esql-ast';
import type { ESQLOrderExpression } from '@kbn/esql-ast/src/types';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { IndicesAutocompleteResult } from '@kbn/esql-types';
import { isPlaceholderColumn } from './utils';
import type { IndexEditorError } from './types';
import { IndexEditorErrors } from './types';
import { parsePrimitive } from './utils';
import { ROW_PLACEHOLDER_PREFIX, COLUMN_PLACEHOLDER_PREFIX } from './constants';
import type { IndexEditorTelemetryService } from './telemetry/telemetry_service';

const DOCS_PER_FETCH = 1000;

const MAX_COLUMN_PLACEHOLDERS = 4;

interface DocUpdate {
  id: string;
  value: Record<string, any>;
}

type BulkUpdateOperations = Array<{ type: 'add-doc'; payload: DocUpdate } | DeleteDocAction>;

function isDocUpdate(update: unknown): update is { type: 'add-doc'; payload: DocUpdate } {
  return (
    typeof update === 'object' && update !== null && 'type' in update && update.type === 'add-doc'
  );
}

function isDocDelete(update: unknown): update is DeleteDocAction {
  return (
    typeof update === 'object' &&
    update !== null &&
    'type' in update &&
    update.type === 'delete-doc'
  );
}

interface ColumnAddition {
  name: string;
}

interface ColumnUpdate {
  name: string;
  previousName?: string;
}

interface DeleteDocAction {
  type: 'delete-doc';
  payload: { ids: string[] };
}

type Action =
  | { type: 'add-doc'; payload: DocUpdate }
  | DeleteDocAction
  | { type: 'saved'; payload: { response: any; updates: DocUpdate[] } }
  | { type: 'add-column' }
  | { type: 'edit-column'; payload: ColumnUpdate }
  | { type: 'delete-column'; payload: ColumnUpdate }
  | { type: 'recalculate-column-placeholders' }
  | { type: 'discard-unsaved-changes' }
  | { type: 'new-row-added'; payload: Record<string, any> };

type ActionMap = {
  [A in Action as A['type']]: A extends { payload: infer P } ? P : undefined;
};

interface PendingDocUpdate {
  type: 'add-doc';
  update: DocUpdate['value'];
}

export type PendingSave = Map<DocUpdate['id'], { type: 'delete-doc' } | PendingDocUpdate>;

export class IndexUpdateService {
  constructor(
    private readonly http: HttpStart,
    private readonly data: DataPublicPluginStart,
    private readonly notifications: NotificationsStart,
    private readonly telemetry: IndexEditorTelemetryService,
    public readonly canEditIndex: boolean
  ) {
    this.listenForUpdates();
  }

  /** Indicates the service has been completed */
  private readonly _completed$ = new Subject<{
    indexName: string | null;
    isIndexCreated: boolean;
  }>();
  public readonly completed$ = this._completed$.asObservable();

  private _indexName$ = new BehaviorSubject<string | null>(null);
  public readonly indexName$: Observable<string | null> = this._indexName$.asObservable();

  /** User input query */
  private readonly _qstr$ = new BehaviorSubject<string>('');
  public readonly qstr$: Observable<string> = this._qstr$.asObservable();
  public setQstr(queryString: string) {
    this._qstr$.next(queryString);
  }

  /** User sort */
  private readonly _sortOrder$ = new BehaviorSubject<SortOrder[]>([]);
  public readonly sortOrder$ = this._sortOrder$.asObservable();
  public setSort(update: SortOrder[]) {
    this._sortOrder$.next(update);
  }

  // Indicated if the index exists (has been created) in Elasticsearch.
  private _indexCreated$ = new BehaviorSubject<boolean>(false);
  public readonly indexCreated$: Observable<boolean> = this._indexCreated$.asObservable();

  public setIndexCreated(created: boolean) {
    this._indexCreated$.next(created);
  }
  public isIndexCreated(): boolean {
    return this._indexCreated$.getValue();
  }

  private readonly _actions$ = new Subject<Action>();
  private addAction<T extends keyof ActionMap>(
    type: T,
    ...payload: ActionMap[T] extends undefined ? [] : [payload: ActionMap[T]]
  ): void {
    const action = payload.length
      ? ({ type, payload: payload[0] } as Extract<Action, { type: T }>)
      : ({ type } as Extract<Action, { type: T }>);

    this._actions$.next(action);
  }

  private readonly _isSaving$ = new BehaviorSubject<boolean>(false);
  public readonly isSaving$: Observable<boolean> = this._isSaving$.asObservable();

  /** Subject to manually flush changes, e.g. on user click */
  private readonly _flush$ = new Subject<{ exitAfterFlush: boolean }>();

  private readonly _isFetching$ = new BehaviorSubject<boolean>(false);
  public readonly isFetching$: Observable<boolean> = this._isFetching$.asObservable();

  private readonly _error$ = new BehaviorSubject<IndexEditorError | null>(null);
  public readonly error$: Observable<IndexEditorError | null> = this._error$.asObservable();

  private readonly _exitAttemptWithUnsavedChanges$ = new BehaviorSubject<boolean>(false);
  public readonly exitAttemptWithUnsavedChanges$ =
    this._exitAttemptWithUnsavedChanges$.asObservable();

  /** ES Documents */
  private readonly _docs$ = new BehaviorSubject<DataTableRecord[]>([]);
  /**
   * Result table rows are generated by merging ES documents with pending changes.
   */
  private readonly _rows$ = new BehaviorSubject<DataTableRecord[]>([]);
  public readonly rows$: Observable<DataTableRecord[]> = this._rows$.asObservable();

  private _pendingColumnsToBeSaved$ = new BehaviorSubject<ColumnAddition[]>([]);
  public readonly pendingColumnsToBeSaved$ = this._pendingColumnsToBeSaved$.asObservable();

  private placeholderIndex = 0;

  private readonly _totalHits$ = new BehaviorSubject<number>(0);
  public readonly totalHits$: Observable<number> = this._totalHits$.asObservable();

  private readonly _refreshSubject$ = new BehaviorSubject<number>(0);

  private readonly _subscription = new Subscription();

  public readonly esqlQuery$: Observable<string> = combineLatest([
    this._indexCreated$,
    this._indexName$,
    this._qstr$,
    this._sortOrder$,
  ]).pipe(
    skipWhile(([indexCreated, indexName]) => {
      return !indexCreated || !indexName;
    }),
    map(([indexCreated, indexName, qstr, sortOrder]) => {
      return this._buildESQLQuery({
        indexName: indexName!,
        qstr,
        includeMetadata: true,
        sortOrder,
      });
    })
  );

  // ESQL query used to build the link to Discover, it does not include metadata fields
  public readonly esqlDiscoverQuery$: Observable<string | undefined> = combineLatest([
    this._indexName$,
    this._qstr$,
    this._sortOrder$,
  ]).pipe(
    map(([indexName, qstr, sortOrder]) => {
      if (indexName) {
        return this._buildESQLQuery({ indexName, qstr, includeMetadata: false, sortOrder });
      }
    })
  );

  private _buildESQLQuery({
    indexName,
    qstr,
    includeMetadata,
    sortOrder,
  }: {
    indexName: string;
    qstr: string | null;
    includeMetadata: boolean;
    sortOrder?: SortOrder[];
  }): string {
    const query = includeMetadata
      ? esql`FROM ${indexName} METADATA _id, _source`
      : esql`FROM ${indexName}`;

    if (qstr) {
      query.pipe`WHERE qstr(${`*${qstr}* OR ${qstr}`})`;
    }

    query.pipe`LIMIT ${DOCS_PER_FETCH}`;

    if (Array.isArray(sortOrder) && sortOrder.length > 0) {
      const [firstSort, ...restSort] = sortOrder as Array<[string, ESQLOrderExpression['order']]>;
      query.sort(firstSort, ...restSort);
    }

    return query.print('basic');
  }

  // Accumulate actions in a buffer
  private bufferState$: Observable<BulkUpdateOperations> = this._actions$.pipe(
    scan((acc: BulkUpdateOperations, action: Action) => {
      switch (action.type) {
        case 'add-doc':
          return [...acc, action];
        case 'delete-doc':
          // if a doc is deleted we need to remove any pending updates to it
          const idsToDelete = new Set(action.payload.ids);
          const updatedAcc = acc.filter(
            (docUpdate) => !isDocUpdate(docUpdate) || !idsToDelete.has(docUpdate.payload.id)
          );
          // Only add the delete action if at least one of the ids is not a placeholder row
          const isDeletingAnySavedColumn = action.payload.ids.some(
            (id) => !id.startsWith(ROW_PLACEHOLDER_PREFIX)
          );
          if (isDeletingAnySavedColumn) {
            updatedAcc.push(action);
          }
          const newTotalHits = this._totalHits$.getValue() - idsToDelete.size;
          this._totalHits$.next(newTotalHits > 1 ? newTotalHits : 1);
          return updatedAcc;
        case 'saved':
          // Clear the buffer after save
          return [];
        case 'discard-unsaved-changes':
          return [];
        case 'edit-column':
          // if a column name has changed, we need to update the values added with the previous name.
          return acc.map((docUpdate) => {
            if (!isDocUpdate(docUpdate)) {
              return docUpdate;
            }
            if (
              action.payload.previousName &&
              docUpdate.payload.value[action.payload.previousName]
            ) {
              const newValue = {
                ...docUpdate.payload.value,
                [action.payload.name]: docUpdate.payload.value[action.payload.previousName],
              };
              delete newValue[action.payload.previousName];
              return { ...docUpdate, payload: { ...docUpdate.payload, value: newValue } };
            }
            return docUpdate;
          });
        case 'delete-column':
          // if a column has been deleted, we need to delete the values added to it.
          return acc.filter((docUpdate) => {
            return (
              isDocDelete(docUpdate) ||
              (isDocUpdate(docUpdate) && !(action.payload.name in docUpdate.payload.value))
            );
          });
        default:
          return acc;
      }
    }, [] as BulkUpdateOperations),
    shareReplay(1) // keep latest buffer for retries
  );

  private readonly _hasUnsavedChanges$ = new BehaviorSubject<boolean>(false);
  public readonly hasUnsavedChanges$: Observable<boolean> = this._hasUnsavedChanges$.asObservable();

  public flush({ exitAfterFlush = false } = {}) {
    this._flush$.next({ exitAfterFlush });
    return this;
  }

  /** Doc updates/additions/deletions that are pending to be saved */
  private readonly _savingDocs$: Observable<PendingSave> = this.bufferState$.pipe(
    map((updates) => {
      // First group all changes by id
      const deletedDocs: Set<string> = new Set(
        updates.filter(isDocDelete).flatMap((v) => v.payload.ids)
      );

      const updatesGroupedByIds = groupBy(
        updates
          .filter(isDocUpdate)
          .filter((update) => deletedDocs.has(update.payload.id) === false)
          .map((v) => v.payload),
        (update) => update.id
      );

      // Merge all grouped updates
      const mergedUpdates: Array<[string, Record<string, any>]> = Object.entries(
        updatesGroupedByIds
      ).map(([docId, docUpdates]) => {
        return [docId, docUpdates.reduce((acc, update) => ({ ...acc, ...update.value }), {})];
      });

      // Result map with deleted docs and merged updates
      const result: PendingSave = new Map();
      deletedDocs.forEach((docId) => {
        result.set(docId, { type: 'delete-doc' });
      });
      mergedUpdates.forEach(([docId, docUpdate]) => {
        result.set(docId, { type: 'add-doc', update: docUpdate });
      });
      return result;
    }),
    startWith(new Map() as PendingSave),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly dataView$: Observable<DataView> = combineLatest([
    this._indexName$,
    this._indexCreated$,
  ]).pipe(
    skipWhile(([indexName, indexCreated]) => {
      return !indexName;
    }),
    switchMap(([indexName]) => from(this.getDataView(indexName!))),
    tap(() => {
      asyncScheduler.schedule(() => this.addAction('recalculate-column-placeholders'));
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

      return dataView.fields
        .concat(unsavedFields)
        .filter((field) => field.spec.metadata_field !== true && !field.spec.subType)
        .map((field) => {
          const datatableColumn: DatatableColumn = {
            name: field.name,
            id: field.name,
            isNull: field.isNull,
            meta: {
              type: field.type as DatatableColumnType,
              params: {
                id: field.name,
              },
              esType: field.esTypes?.at(0),
            },
          };
          return datatableColumn;
        });
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

    const esqlQuery = esql`FROM ${indexName}`.print();

    const newDataView = await getESQLAdHocDataview(esqlQuery, this.data.dataViews, {
      allowNoIndex: true,
    });

    // If at some point the index existed, the dataView fields are present in the browser cache, we need to force refresh it.
    await this.data.dataViews.refreshFields(newDataView, false, true);

    return newDataView;
  }

  private listenForUpdates() {
    this._subscription.add(
      this.bufferState$
        .pipe(
          map((actions) =>
            actions.some((action) => {
              if (action.type === 'add-doc') {
                // Only consider rows with at least one value
                return Object.keys(action.payload.value).length > 0;
              }
              return action.type === 'delete-doc';
            })
          )
        )
        .subscribe(this._hasUnsavedChanges$)
    );

    // Result rows
    this._subscription.add(
      combineLatest([this._docs$, this._savingDocs$]).subscribe(([rows, savingDocs]) => {
        const resultRows = rows
          // Filter out docs that are scheduled for deletion or placeholder rows (that are handled apart)
          .filter((v) => {
            const pendingUpdate = savingDocs.get(v.id);
            return pendingUpdate?.type !== 'delete-doc' && !v.id.startsWith(ROW_PLACEHOLDER_PREFIX);
          })
          .map((v) => {
            const pendingUpdate = savingDocs.get(v.id);
            if (pendingUpdate?.type === 'add-doc') {
              const mergedSource = { ...v.flattened, ...pendingUpdate.update };
              return { ...v, raw: mergedSource, flattened: mergedSource };
            }
            return v;
          });

        // created docs that are not saved yet should be rendered first
        Array.from(savingDocs.entries())
          .filter((arg): arg is [id: string, v: PendingDocUpdate] => {
            const [id, v] = arg;
            return v.type === 'add-doc' && id.startsWith(ROW_PLACEHOLDER_PREFIX);
          })
          .forEach(([id, v]) => {
            resultRows.unshift({ id, flattened: v.update, raw: v.update });
          });

        // If no rows left, add a placeholder row
        if (resultRows.length === 0) {
          resultRows.push(this.buildPlaceholderRow());
        }
        this._rows$.next(resultRows);
      })
    );

    // Queue for bulk updates
    this._subscription.add(
      this._flush$
        .pipe(
          withLatestFrom(this.bufferState$),
          map(([, updates]) => updates),
          skipWhile(() => !this.isIndexCreated()),
          filter((updates) => updates.length > 0),
          map((updates) => ({ updates, startTime: Date.now() })),
          tap(() => {
            this._isSaving$.next(true);
          }),
          // Save updates
          exhaustMap(({ updates, startTime }) => {
            return from(this.bulkUpdate(updates)).pipe(
              catchError((errors) => {
                return of({
                  bulkOperations: [],
                  bulkResponse: { errors: true } as BulkResponse,
                });
              }),
              map((response) => {
                return {
                  updates,
                  response: response.bulkResponse,
                  bulkOperations: response.bulkOperations,
                  startTime,
                };
              })
            );
          }),
          withLatestFrom(this._flush$, this._docs$, this.dataView$, this._savingDocs$),
          switchMap(
            ([
              { updates, response, bulkOperations, startTime },
              { exitAfterFlush },
              docs,
              dataView,
              savingDocs,
            ]) =>
              // Refresh the data view fields to get new columns types if any
              from(this.data.dataViews.refreshFields(dataView, false, true)).pipe(
                map(() => ({
                  updates,
                  response,
                  bulkOperations,
                  exitAfterFlush,
                  docs,
                  savingDocs,
                  startTime,
                }))
              )
          )
        )
        .subscribe({
          next: ({
            updates,
            response,
            bulkOperations,
            exitAfterFlush,
            docs,
            savingDocs,
            startTime,
          }) => {
            this._isSaving$.next(false);

            // Send telemetry about the save event
            const { newRowsCount, newColumnsCount, cellsEditedCount } = this.summarizeSavingUpdates(
              savingDocs,
              updates
            );
            this.telemetry.trackSaveSubmitted({
              pendingRowsAdded: newRowsCount,
              pendingColsAdded: newColumnsCount,
              pendingCellsEdited: cellsEditedCount,
              action: exitAfterFlush ? 'save_and_exit' : 'save',
              outcome: response.errors ? 'error' : 'success',
              latency: Date.now() - startTime,
            });

            if (!response.errors) {
              if (exitAfterFlush) {
                this.destroy();
              }
            } else {
              const errorDetail = response?.items
                .map((item) => Object.values(item)[0])
                .filter((res) => res.error)
                .map((res) => `- ${res.error?.type}: ${res.error?.reason}`)
                .join('\n');

              this.setError(IndexEditorErrors.PARTIAL_SAVING_ERROR, errorDetail);
            }

            const updatedIds = new Set(
              response.items
                .filter((v) => !v.delete && Object.values(v)[0].status === 200)
                .map((v) => Object.values(v)[0]._id)
            );

            const deletedIds = response.items
              .filter((v) => v.delete && v.delete?.status === 200)
              .map((v) => v.delete!._id);

            const updatedDocs = docs
              .map((row) => {
                const update =
                  updatedIds.has(row.id) && savingDocs.has(row.id)
                    ? (savingDocs.get(row.id) as PendingDocUpdate).update ?? {}
                    : {};
                const mergedSource = { ...row.raw, ...update };
                return { ...row, raw: mergedSource, flattened: mergedSource };
              })
              .filter((row) => !deletedIds.includes(row.id));

            const newDocs: DataTableRecord[] = response.items.reduce<DataTableRecord[]>(
              (acc, item, index) => {
                if (item.index && item.index?.status === 201 && item.index._id) {
                  const newDocValue = (bulkOperations as any)?.[index]?.[1] as Record<
                    string,
                    unknown
                  >;
                  if (newDocValue) {
                    const newDoc: DataTableRecord = {
                      id: item.index._id,
                      flattened: newDocValue,
                      raw: newDocValue,
                    };
                    return [...acc, newDoc];
                  }
                }
                return acc;
              },
              []
            );

            newDocs.forEach((doc: DataTableRecord) => {
              updatedDocs.unshift(doc);
            });

            this._docs$.next(updatedDocs);

            // Clear the buffer after successful update
            this.addAction('saved', {
              response,
              updates: updates.filter(isDocUpdate).map((update) => update.payload),
            });
          },
          error: () => {
            this.setError(IndexEditorErrors.GENERIC_SAVING_ERROR);
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
              .map((row) => {
                return {
                  id: row._id,
                  raw: row,
                  flattened: row,
                } as unknown as DataTableRecord;
              });

            if (resultRows.length === 0) {
              resultRows.push(this.buildPlaceholderRow());
            }

            this._docs$.next(resultRows);
            this._totalHits$.next(total ?? 0);
            this._isFetching$.next(false);
          },
          error: (error) => {
            this._isFetching$.next(false);
          },
        })
    );

    // Maintains a list of pending columns to be saved,
    // ensuring placeholder columns are displayed correctly.
    this._subscription.add(
      this._actions$
        .pipe(
          withLatestFrom(this.dataView$.pipe(startWith(undefined))),
          scan((acc: ColumnAddition[], [action, dataView]) => {
            if (!dataView) {
              return this.completeWithPlaceholders(0);
            }
            if (action.type === 'add-column') {
              return [...acc, { name: `${COLUMN_PLACEHOLDER_PREFIX}${this.placeholderIndex++}` }];
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
                action.payload.updates.every((update) => update.value[column.name] === undefined)
              );
            }
            if (action.type === 'new-row-added') {
              // Filter out columns that were populated when adding a new row
              return acc.filter((column) => action.payload[column.name] === undefined);
            }
            if (action.type === 'discard-unsaved-changes') {
              return this.completeWithPlaceholders(0);
            }
            if (action.type === 'recalculate-column-placeholders') {
              const columnsCount = dataView.fields.filter(
                // @ts-ignore
                (field) => field.spec.metadata_field !== true && !field.spec.subType
              ).length;
              return this.completeWithPlaceholders(columnsCount);
            }
            return acc;
          }, [])
        )
        .subscribe(this._pendingColumnsToBeSaved$)
    );
  }

  private summarizeSavingUpdates(savingDocs: PendingSave, updates: BulkUpdateOperations) {
    const newRowsCount = Array.from(savingDocs.keys()).filter((id) =>
      id.startsWith(ROW_PLACEHOLDER_PREFIX)
    ).length;

    const newColumnsCount = this._pendingColumnsToBeSaved$
      .getValue()
      .filter((col) => !isPlaceholderColumn(col.name)).length;

    const cellsEditedCount = updates.filter(
      (update) => isDocUpdate(update) && !update.payload.id.startsWith(ROW_PLACEHOLDER_PREFIX)
    ).length;

    return { newRowsCount, newColumnsCount, cellsEditedCount };
  }

  private completeWithPlaceholders(currentColumnsCount: number) {
    const missingPlaceholders = MAX_COLUMN_PLACEHOLDERS - currentColumnsCount;
    return missingPlaceholders > 0
      ? times(missingPlaceholders, () => ({
          name: `${COLUMN_PLACEHOLDER_PREFIX}${this.placeholderIndex++}`,
        }))
      : [];
  }

  private buildPlaceholderRow(): DataTableRecord {
    const docId = `${ROW_PLACEHOLDER_PREFIX}${uuidv4()}`;
    return {
      id: docId,
      raw: {
        _id: docId,
      },
      flattened: {
        _id: docId,
      },
    };
  }

  public refresh() {
    this._isFetching$.next(true);
    this._refreshSubject$.next(Date.now());
  }

  public setIsSaving(isSaving: boolean) {
    this._isSaving$.next(isSaving);
  }

  public setIndexName(indexName: string) {
    this._indexName$.next(indexName);
  }

  public getIndexName(): string | null {
    return this._indexName$.getValue();
  }

  /** Adds an empty document */
  public addEmptyRow() {
    const newDocId = `${ROW_PLACEHOLDER_PREFIX}${uuidv4()}`;
    this.addAction('add-doc', { id: newDocId, value: {} });
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
    this.addAction('add-doc', { id, value: parsedUpdate });
  }

  /** Schedules documents for deletion */
  public deleteDoc(ids: string[]) {
    this.addAction('delete-doc', { ids });
  }

  /**
   * Sends a bulk update request to an index.
   * @param updates
   */
  public async bulkUpdate(updates: BulkUpdateOperations): Promise<{
    bulkOperations: Exclude<BulkRequest['operations'], undefined>;
    bulkResponse: BulkResponse;
  }> {
    const deletingDocIds: string[] = updates
      .filter(isDocDelete)
      .map((v) => v.payload.ids)
      .flat();

    const indexActions = updates.filter(isDocUpdate);

    // First split updates into index and delete operations
    const groupedOperations = groupBy(
      indexActions.map((v) => v.payload),
      (update) =>
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

    // Filter out new docs that have no fields defined
    const newDocOperations = Object.entries(newDocs)
      .filter(([, doc]) => Object.keys(doc).length > 0)
      .map(([id, doc]) => {
        return [{ index: {} }, doc];
      });

    const operations: BulkRequest['operations'] = [
      ...updateOperations,
      ...newDocOperations,
      ...deletingDocIds.map((id) => {
        return [{ delete: { _id: id } }];
      }),
    ];

    if (!operations.length) {
      // nothing to send
      throw new Error('empty operations');
    }

    const body = JSON.stringify({
      operations: operations.flat(),
    });

    const bulkResponse = await this.http.post<BulkResponse>(
      `/internal/esql/lookup_index/${this.getIndexName()}/update`,
      {
        body,
      }
    );

    return {
      bulkResponse,
      bulkOperations: operations,
    };
  }

  public addNewColumn() {
    this.addAction('add-column');
  }

  public editColumn(name: string, previousName: string) {
    this.addAction('edit-column', { name, previousName });
  }

  public deleteColumn(name: string) {
    this.addAction('delete-column', { name });
  }

  public setExitAttemptWithUnsavedChanges(value: boolean) {
    this._exitAttemptWithUnsavedChanges$.next(value);
  }

  public discardUnsavedChanges() {
    this.addAction('discard-unsaved-changes');
  }

  public setError(errorId: IndexEditorErrors | null, details?: string) {
    if (errorId) {
      this._error$.next({
        id: errorId,
        details,
      });
    } else {
      this._error$.next(null);
    }
  }

  public destroy() {
    this._completed$.next({
      indexName: this.getIndexName(),
      isIndexCreated: this.isIndexCreated(),
    });
    this._completed$.complete();

    this._subscription.unsubscribe();
    // complete all subjects
    this._isSaving$.complete();
    this._isFetching$.complete();
    this._docs$.complete();
    this._totalHits$.complete();
    this._actions$.complete();
    this._pendingColumnsToBeSaved$.complete();
    this._indexCreated$.complete();
    this._qstr$.complete();
    this._refreshSubject$.complete();
    this._exitAttemptWithUnsavedChanges$.complete();
    this.data.dataViews.clearCache();
    this._indexName$.complete();

    this.data.dataViews.clearInstanceCache();
  }

  public async createIndex({ exitAfterFlush = false }) {
    try {
      this._isSaving$.next(true);
      await this.http.post(`/internal/esql/lookup_index/${this.getIndexName()}`);

      this.setIndexCreated(true);
      this.flush({ exitAfterFlush });
    } catch (error) {
      throw error;
    } finally {
      this._isSaving$.next(false);
    }
  }

  public async onFileUploadFinished(indexName: string) {
    if (this.isIndexCreated()) {
      const dataView = await firstValueFrom(this.dataView$);
      await this.data.dataViews.refreshFields(dataView, false, true);
      this.refresh();
      this.addAction('recalculate-column-placeholders');
      // Only set isSaving to false when fetching is done to avoid flickering
      this.isFetching$
        .pipe(
          filter((isFetching) => !isFetching),
          first()
        )
        .subscribe(() => {
          this.notifications.toasts.addSuccess({
            title: i18n.translate('indexEditor.indexManagement.dataAppendedNotificationTitle', {
              defaultMessage: 'File data has been appended to the index.',
            }),
          });
          this._isSaving$.next(false);
        });
    } else {
      this.setIndexName(indexName);
      this.setIndexCreated(true);
      this._isSaving$.next(false);
    }
  }

  public async doesIndexExist(indexName: string): Promise<boolean> {
    const lookupIndexesResult = await this.http.get<IndicesAutocompleteResult>(
      '/internal/esql/autocomplete/join/indices'
    );

    return lookupIndexesResult.indices.some((index) => index.name === indexName);
  }

  public exit() {
    const hasUnsavedChanges = this._hasUnsavedChanges$.getValue();
    const unsavedColumns = this._pendingColumnsToBeSaved$
      .getValue()
      .filter((col) => !isPlaceholderColumn(col.name));

    if (hasUnsavedChanges || unsavedColumns.length > 0) {
      this.setExitAttemptWithUnsavedChanges(true);
    } else {
      this.destroy();
    }
  }
}
