/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest, IBasePath } from '@kbn/core-http-server';
import type {
  ISavedObjectsRepository,
  SavedObjectsIncrementCounterField,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { CoreUsageStats } from '@kbn/core-usage-data-server';
import {
  type ICoreUsageStatsClient,
  type BaseIncrementOptions,
  type IncrementSavedObjectsImportOptions,
  type IncrementSavedObjectsResolveImportErrorsOptions,
  type IncrementSavedObjectsExportOptions,
  CORE_USAGE_STATS_TYPE,
  CORE_USAGE_STATS_ID,
  REPOSITORY_RESOLVE_OUTCOME_STATS,
} from '@kbn/core-usage-data-base-server-internal';
import { bufferWhen, exhaustMap, filter, map, merge, Subject, takeUntil, timer } from 'rxjs';

export const BULK_CREATE_STATS_PREFIX = 'apiCalls.savedObjectsBulkCreate';
export const BULK_GET_STATS_PREFIX = 'apiCalls.savedObjectsBulkGet';
export const BULK_RESOLVE_STATS_PREFIX = 'apiCalls.savedObjectsBulkResolve';
export const BULK_UPDATE_STATS_PREFIX = 'apiCalls.savedObjectsBulkUpdate';
export const BULK_DELETE_STATS_PREFIX = 'apiCalls.savedObjectsBulkDelete';
export const CREATE_STATS_PREFIX = 'apiCalls.savedObjectsCreate';
export const DELETE_STATS_PREFIX = 'apiCalls.savedObjectsDelete';
export const FIND_STATS_PREFIX = 'apiCalls.savedObjectsFind';
export const GET_STATS_PREFIX = 'apiCalls.savedObjectsGet';
export const RESOLVE_STATS_PREFIX = 'apiCalls.savedObjectsResolve';
export const UPDATE_STATS_PREFIX = 'apiCalls.savedObjectsUpdate';
export const IMPORT_STATS_PREFIX = 'apiCalls.savedObjectsImport';
export const RESOLVE_IMPORT_STATS_PREFIX = 'apiCalls.savedObjectsResolveImportErrors';
export const EXPORT_STATS_PREFIX = 'apiCalls.savedObjectsExport';
export const LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX = 'apiCalls.legacyDashboardImport';
export const LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX = 'apiCalls.legacyDashboardExport';

const ALL_COUNTER_FIELDS = [
  // Saved Objects Client APIs
  ...getFieldsForCounter(BULK_CREATE_STATS_PREFIX),
  ...getFieldsForCounter(BULK_GET_STATS_PREFIX),
  ...getFieldsForCounter(BULK_RESOLVE_STATS_PREFIX),
  ...getFieldsForCounter(BULK_UPDATE_STATS_PREFIX),
  ...getFieldsForCounter(BULK_DELETE_STATS_PREFIX),
  ...getFieldsForCounter(CREATE_STATS_PREFIX),
  ...getFieldsForCounter(DELETE_STATS_PREFIX),
  ...getFieldsForCounter(FIND_STATS_PREFIX),
  ...getFieldsForCounter(GET_STATS_PREFIX),
  ...getFieldsForCounter(RESOLVE_STATS_PREFIX),
  ...getFieldsForCounter(UPDATE_STATS_PREFIX),
  // Saved Objects Management APIs
  ...getFieldsForCounter(IMPORT_STATS_PREFIX),
  `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
  `${IMPORT_STATS_PREFIX}.overwriteEnabled.yes`,
  `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`,
  ...getFieldsForCounter(RESOLVE_IMPORT_STATS_PREFIX),
  `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
  ...getFieldsForCounter(EXPORT_STATS_PREFIX),
  ...getFieldsForCounter(LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX),
  ...getFieldsForCounter(LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX),
  `${EXPORT_STATS_PREFIX}.allTypesSelected.yes`,
  `${EXPORT_STATS_PREFIX}.allTypesSelected.no`,
  // Saved Objects Repository counters; these are included here for stats collection, but are incremented in the repository itself
  REPOSITORY_RESOLVE_OUTCOME_STATS.EXACT_MATCH,
  REPOSITORY_RESOLVE_OUTCOME_STATS.ALIAS_MATCH,
  REPOSITORY_RESOLVE_OUTCOME_STATS.CONFLICT,
  REPOSITORY_RESOLVE_OUTCOME_STATS.NOT_FOUND,
  REPOSITORY_RESOLVE_OUTCOME_STATS.TOTAL,
];
const SPACE_CONTEXT_REGEX = /^\/s\/([a-z0-9_\-]+)/;

/** @internal */
export class CoreUsageStatsClient implements ICoreUsageStatsClient {
  private readonly fieldsToIncrement$ = new Subject<string[]>();
  private readonly flush$ = new Subject<void>();

  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly basePath: IBasePath,
    private readonly repositoryPromise: Promise<ISavedObjectsRepository>,
    stop$: Subject<void>,
    bufferTimeMs: number = 10_000
  ) {
    this.fieldsToIncrement$
      .pipe(
        takeUntil(stop$),
        // Buffer until either the timer or a forced flush occur
        bufferWhen(() => merge(timer(bufferTimeMs, bufferTimeMs), this.flush$)),
        map((listOfFields) => {
          const fieldsMap = listOfFields.flat().reduce((acc, fieldName) => {
            const incrementCounterField: Required<SavedObjectsIncrementCounterField> = acc.get(
              fieldName
            ) ?? {
              fieldName,
              incrementBy: 0,
            };
            incrementCounterField.incrementBy++;
            return acc.set(fieldName, incrementCounterField);
          }, new Map<string, Required<SavedObjectsIncrementCounterField>>());
          return [...fieldsMap.values()];
        }),
        filter((fields) => fields.length > 0),
        exhaustMap(async (fields) => {
          const options = { refresh: false };
          try {
            const repository = await this.repositoryPromise;
            await repository.incrementCounter(
              CORE_USAGE_STATS_TYPE,
              CORE_USAGE_STATS_ID,
              fields,
              options
            );
          } catch (err) {
            // do nothing
          }
        })
      )
      .subscribe();
  }

  public async getUsageStats() {
    this.debugLogger('getUsageStats() called');
    let coreUsageStats: CoreUsageStats = {};
    try {
      const repository = await this.repositoryPromise;
      this.flush$.next();
      const result = await repository.incrementCounter<CoreUsageStats>(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        ALL_COUNTER_FIELDS,
        { initialize: true } // set all counter fields to 0 if they don't exist
      );
      coreUsageStats = result.attributes;
    } catch (err) {
      // do nothing
    }
    return coreUsageStats;
  }

  public async incrementSavedObjectsBulkCreate(options: BaseIncrementOptions) {
    await this.updateUsageStats([], BULK_CREATE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsBulkGet(options: BaseIncrementOptions) {
    await this.updateUsageStats([], BULK_GET_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsBulkResolve(options: BaseIncrementOptions) {
    await this.updateUsageStats([], BULK_RESOLVE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsBulkUpdate(options: BaseIncrementOptions) {
    await this.updateUsageStats([], BULK_UPDATE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsBulkDelete(options: BaseIncrementOptions) {
    await this.updateUsageStats([], BULK_DELETE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsCreate(options: BaseIncrementOptions) {
    await this.updateUsageStats([], CREATE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsDelete(options: BaseIncrementOptions) {
    await this.updateUsageStats([], DELETE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsFind(options: BaseIncrementOptions) {
    await this.updateUsageStats([], FIND_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsGet(options: BaseIncrementOptions) {
    await this.updateUsageStats([], GET_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsResolve(options: BaseIncrementOptions) {
    await this.updateUsageStats([], RESOLVE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsUpdate(options: BaseIncrementOptions) {
    await this.updateUsageStats([], UPDATE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsImport(options: IncrementSavedObjectsImportOptions) {
    const { createNewCopies, overwrite, compatibilityMode } = options;
    const counterFieldNames = [
      `createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`,
      ...(!createNewCopies ? [`overwriteEnabled.${overwrite ? 'yes' : 'no'}`] : []), // the overwrite option is ignored when createNewCopies is true
      ...(!createNewCopies ? [`compatibilityModeEnabled.${compatibilityMode ? 'yes' : 'no'}`] : []), // the compatibilityMode option is ignored when createNewCopies is true
    ];
    await this.updateUsageStats(counterFieldNames, IMPORT_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsResolveImportErrors(
    options: IncrementSavedObjectsResolveImportErrorsOptions
  ) {
    const { createNewCopies, compatibilityMode } = options;
    const counterFieldNames = [
      `createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`,
      ...(!createNewCopies ? [`compatibilityModeEnabled.${compatibilityMode ? 'yes' : 'no'}`] : []), // the compatibilityMode option is ignored when createNewCopies is true
    ];
    await this.updateUsageStats(counterFieldNames, RESOLVE_IMPORT_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsExport(options: IncrementSavedObjectsExportOptions) {
    const { types, supportedTypes } = options;
    const isAllTypesSelected = !!types && supportedTypes.every((x) => types.includes(x));
    const counterFieldNames = [`allTypesSelected.${isAllTypesSelected ? 'yes' : 'no'}`];
    await this.updateUsageStats(counterFieldNames, EXPORT_STATS_PREFIX, options);
  }

  public async incrementLegacyDashboardsImport(options: BaseIncrementOptions) {
    await this.updateUsageStats([], LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX, options);
  }

  public async incrementLegacyDashboardsExport(options: BaseIncrementOptions) {
    await this.updateUsageStats([], LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX, options);
  }

  private async updateUsageStats(
    counterFieldNames: string[],
    prefix: string,
    { request }: BaseIncrementOptions
  ) {
    const fields = this.getFieldsToIncrement(counterFieldNames, prefix, request);
    this.fieldsToIncrement$.next(fields);
  }

  private getIsDefaultNamespace(request: KibanaRequest) {
    const requestBasePath = this.basePath.get(request); // obtain the original request basePath, as it may have been modified by a request interceptor
    const pathToCheck = this.basePath.remove(requestBasePath); // remove the server basePath from the request basePath
    const matchResult = pathToCheck.match(SPACE_CONTEXT_REGEX); // Look for `/s/space-url-context` in the base path

    if (!matchResult || matchResult.length === 0) {
      return true;
    }

    // Ignoring first result, we only want the capture group result at index 1
    const [, spaceId] = matchResult;

    return spaceId === DEFAULT_NAMESPACE_STRING;
  }

  private getFieldsToIncrement(
    counterFieldNames: string[],
    prefix: string,
    request: KibanaRequest
  ) {
    const isKibanaRequest = getIsKibanaRequest(request);
    const isDefaultNamespace = this.getIsDefaultNamespace(request);
    const namespaceField = isDefaultNamespace ? 'default' : 'custom';
    return [
      'total',
      `namespace.${namespaceField}.total`,
      `namespace.${namespaceField}.kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
      ...counterFieldNames,
    ].map((x) => `${prefix}.${x}`);
  }
}

function getFieldsForCounter(prefix: string) {
  return [
    'total',
    'namespace.default.total',
    'namespace.default.kibanaRequest.yes',
    'namespace.default.kibanaRequest.no',
    'namespace.custom.total',
    'namespace.custom.kibanaRequest.yes',
    'namespace.custom.kibanaRequest.no',
  ].map((x) => `${prefix}.${x}`);
}

function getIsKibanaRequest({ headers }: KibanaRequest) {
  // The presence of these request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  return (
    headers && headers['kbn-version'] && headers.referer && headers['x-elastic-internal-origin']
  );
}
