/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart } from '@kbn/core/public';
import { type DataPublicPluginStart, KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { groupBy, times, zipObject } from 'lodash';
import type { Observable } from 'rxjs';
import {
  BehaviorSubject,
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
  takeWhile,
  tap,
  timer,
  withLatestFrom,
  catchError,
  exhaustMap,
} from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Builder, BasicPrettyPrinter } from '@kbn/esql-ast';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { IndexEditorErrors } from './types';
import { parsePrimitive, isPlaceholderColumn } from './utils';
import { ROW_PLACEHOLDER_PREFIX, COLUMN_PLACEHOLDER_PREFIX } from './constants';
const BUFFER_TIMEOUT_MS = 5000; // 5 seconds

const UNDO_EMIT_MS = 500; // 0.5 seconds

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
  | { type: 'undo' }
  | { type: 'saved'; payload: { response: any; updates: DocUpdate[] } }
  | { type: 'add-column' }
  | { type: 'edit-column'; payload: ColumnUpdate }
  | { type: 'delete-column'; payload: ColumnUpdate }
  | { type: 'discard-unsaved-changes' }
  | { type: 'new-row-added'; payload: Record<string, any> };

type ActionMap = {
  [A in Action as A['type']]: A extends { payload: infer P } ? P : undefined;
};

export type PendingSave = Map<DocUpdate['id'], DocUpdate['value']>;

export class IndexUpdateService {
  constructor(private readonly http: HttpStart, private readonly data: DataPublicPluginStart) {
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
  private readonly _flush$ = new Subject<number>();

  private readonly _isFetching$ = new BehaviorSubject<boolean>(false);
  public readonly isFetching$: Observable<boolean> = this._isFetching$.asObservable();

  private readonly _error$ = new BehaviorSubject<IndexEditorErrors | null>(null);
  public readonly error$: Observable<IndexEditorErrors | null> = this._error$.asObservable();

  private readonly _exitAttemptWithUnsavedChanges$ = new BehaviorSubject<boolean>(false);
  public readonly exitAttemptWithUnsavedChanges$ =
    this._exitAttemptWithUnsavedChanges$.asObservable();

  private readonly _isProcessingImportedFiles = new BehaviorSubject<boolean>(false);
  public readonly isProcessingImportedFiles$: Observable<boolean> =
    this._isProcessingImportedFiles.asObservable();

  private readonly _fileImported$ = new Subject<void>();

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
          args: [
            Builder.expression.column({ args: [Builder.identifier({ name: '_id' })] }),
            Builder.expression.column({
              args: [Builder.identifier({ name: '_source' })],
            }),
          ],
        })
      );
    }

    // WHERE qstr("message: …")
    const whereCmd = Builder.command({
      name: 'where',
      args: [Builder.expression.func.call('qstr', [Builder.expression.literal.string(qstr ?? '')])],
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

  // Accumulate actions in a buffer
  private bufferState$: Observable<BulkUpdateOperations> = this._actions$.pipe(
    scan((acc: BulkUpdateOperations, action: Action) => {
      this._error$.next(null);

      switch (action.type) {
        case 'add-doc':
          return [...acc, action];
        case 'delete-doc':
          return [...acc, action];
        case 'undo':
          return acc.slice(0, -1); // remove last
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

  public flush() {
    this._flush$.next(Date.now());
    return this;
  }

  /** Doc updates/additions that are pending to be saved */
  public readonly savingDocs$: Observable<PendingSave> = this.bufferState$.pipe(
    map((updates) => {
      return updates
        .filter(isDocUpdate)
        .map((v) => v.payload)
        .reduce((acc, update) => {
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
    this._fileImported$.pipe(startWith(undefined)),
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
      title: indexName,
      name: indexName,
      // The index might not exist yet
      allowNoIndex: true,
    });
  }

  private listenForUpdates() {
    this._subscription.add(
      this.bufferState$
        .pipe(
          map((actions) =>
            actions.some((action) =>
              (
                ['add-column', 'add-doc', 'delete-column', 'delete-doc'] as Array<keyof ActionMap>
              ).includes(action.type)
            )
          )
        )
        .subscribe(this._hasUnsavedChanges$)
    );

    // Queue for bulk updates
    this._subscription.add(
      combineLatest([this.bufferState$, this._flush$])
        .pipe(
          skipWhile(() => !this.isIndexCreated()),
          filter(([updates]) => updates.length > 0),
          tap(() => {
            this._isSaving$.next(true);
          }),
          // Save updates
          exhaustMap(([updates]) => {
            return from(this.bulkUpdate(updates)).pipe(
              catchError((errors) => {
                return of({ errors: true } as BulkResponse);
              }),
              map((response) => {
                return { updates, response };
              })
            );
          }),
          withLatestFrom(this._rows$, this.dataView$, this.savingDocs$),
          switchMap(([{ updates, response }, rows, dataView, savingDocs]) =>
            // Refresh the data view fields to get new columns types if any
            from(this.data.dataViews.refreshFields(dataView, false, true)).pipe(
              map(() => ({ updates, response, rows, savingDocs }))
            )
          )
        )
        .subscribe({
          next: ({ updates: bulkUpdateOperations, response, rows, savingDocs }) => {
            this._isSaving$.next(false);

            if (!response.errors) {
              this.destroy();
              // Close the flyout after successful save
            } else {
              this._error$.next(IndexEditorErrors.PARTIAL_SAVING_ERROR);
            }

            const savedIds = new Set(
              response.items
                .filter((v) => !v.delete && Object.values(v)[0].status === 200)
                .map((v) => Object.values(v)[0]._id)
            );

            this._rows$.next(
              rows.map((row) => {
                const update =
                  savedIds.has(row.id) && savingDocs.has(row.id)
                    ? savingDocs.get(row.id) ?? {}
                    : {};
                const mergedSource = { ...row.raw, ...update };

                return { ...row, raw: mergedSource, flattened: mergedSource };
              })
            );

            // Clear the buffer after successful update
            this.addAction('saved', {
              response,
              updates: bulkUpdateOperations.filter(isDocUpdate).map((update) => update.payload),
            });
          },
          error: () => {
            this._error$.next(IndexEditorErrors.GENERIC_SAVING_ERROR);
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

            this._rows$.next(resultRows);
            this._totalHits$.next(total ?? 0);
            this._isFetching$.next(false);
            this.setIsImportingFile(false);
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
                if (action.type === 'discard-unsaved-changes') {
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

  public async processImportedData(indexName: string) {
    if (this.isIndexCreated()) {
      // We are appending the imported file to existing data, we need to refresh the fields
      this.refresh();
      const dataView = await firstValueFrom(this.dataView$);
      await this.data.dataViews.refreshFields(dataView, false, true);
      this._fileImported$.next();
    } else {
      this.setIndexName(indexName);
      this.setIndexCreated(true);

      this.refresh(); // HD needed?
    }
  }

  public refresh() {
    this._isFetching$.next(true);
    this._refreshSubject$.next(Date.now());
  }

  public setIsFetching(isFetching: boolean) {
    this._isFetching$.next(isFetching);
  }

  public setIsImportingFile(isImporting: boolean) {
    this._isProcessingImportedFiles.next(isImporting);
  }

  public setIndexName(indexName: string) {
    this._indexName$.next(indexName);
  }

  public getIndexName(): string | null {
    return this._indexName$.getValue();
  }

  public addEmptyRow() {
    const placeholder = this.buildPlaceholderRow();
    this._rows$.next([placeholder, ...this._rows$.getValue()]);
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

    // Remove rows with matching ids from _rows$
    const currentRows = this._rows$.getValue();
    const updatedRows = currentRows.filter((row) => !ids.includes(row.id));

    // If no rows left, add a placeholder row
    if (updatedRows.length === 0) {
      updatedRows.push(this.buildPlaceholderRow());
    }

    this._rows$.next(updatedRows);
  }

  /**
   * Sends bulk update request to an index.
   * @param updates
   */
  public bulkUpdate(updates: BulkUpdateOperations): Promise<BulkResponse> {
    const deletingDocIds: string[] = updates
      .filter(isDocDelete)
      .map((v) => v.payload.ids)
      .flat();
    const deletingDocIdsSet = new Set(deletingDocIds);

    // Filter out deleted docs
    const indexActions = updates
      .filter(isDocUpdate)
      .filter((action) => !deletingDocIdsSet.has(action.payload.id));

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

    const newDocOperations = Object.entries(newDocs).map(([id, doc]) => {
      return [{ index: {} }, doc];
    });

    const operations: BulkRequest['operations'] = [
      ...updateOperations,
      ...newDocOperations,
      ...deletingDocIds
        .filter((v) => !v.startsWith(ROW_PLACEHOLDER_PREFIX))
        .map((id) => {
          return [{ delete: { _id: id } }];
        }),
    ];

    if (!operations.length) {
      // northing to send
      throw new Error('empty operations');
    }

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

  /** Cancel the latest update operation */
  public undo() {
    this.addAction('undo');
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
    this._rows$.complete();
    this._totalHits$.complete();
    this._actions$.complete();
    this._pendingColumnsToBeSaved$.complete();
    this._indexCrated$.complete();
    this._qstr$.complete();
    this._refreshSubject$.complete();
    this._exitAttemptWithUnsavedChanges$.complete();
    this.data.dataViews.clearCache();
    this._fileImported$.complete();
    this._indexName$.complete();

    this.data.dataViews.clearInstanceCache();
  }

  public async createIndex() {
    try {
      this._isSaving$.next(true);

      const updates = await firstValueFrom(this.bufferState$);

      await this.http.post(`/internal/esql/lookup_index/${this.getIndexName()}`);
      await this.bulkUpdate(updates);

      this.setIndexCreated(true);
      this.addAction('discard-unsaved-changes');
    } catch (error) {
      throw error;
    } finally {
      this._isSaving$.next(false);
    }
  }

  public exit() {
    const hasUnsavedChanges = this._hasUnsavedChanges$.getValue();
    if (hasUnsavedChanges) {
      this.setExitAttemptWithUnsavedChanges(true);
    } else {
      this.destroy();
    }
  }
}
