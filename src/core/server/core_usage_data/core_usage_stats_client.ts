/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CORE_USAGE_STATS_TYPE, CORE_USAGE_STATS_ID } from './constants';
import { CoreUsageStats } from './types';
import { DEFAULT_NAMESPACE_STRING } from '../saved_objects/service/lib/utils';
import {
  ISavedObjectsRepository,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
  KibanaRequest,
  IBasePath,
} from '..';

/** @internal */
export interface BaseIncrementOptions {
  request: KibanaRequest;
}
/** @internal */
export type IncrementSavedObjectsImportOptions = BaseIncrementOptions &
  Pick<SavedObjectsImportOptions, 'createNewCopies' | 'overwrite'>;
/** @internal */
export type IncrementSavedObjectsResolveImportErrorsOptions = BaseIncrementOptions &
  Pick<SavedObjectsResolveImportErrorsOptions, 'createNewCopies'>;
/** @internal */
export type IncrementSavedObjectsExportOptions = BaseIncrementOptions & {
  types?: string[];
  supportedTypes: string[];
};

export const BULK_CREATE_STATS_PREFIX = 'apiCalls.savedObjectsBulkCreate';
export const BULK_GET_STATS_PREFIX = 'apiCalls.savedObjectsBulkGet';
export const BULK_UPDATE_STATS_PREFIX = 'apiCalls.savedObjectsBulkUpdate';
export const CREATE_STATS_PREFIX = 'apiCalls.savedObjectsCreate';
export const DELETE_STATS_PREFIX = 'apiCalls.savedObjectsDelete';
export const FIND_STATS_PREFIX = 'apiCalls.savedObjectsFind';
export const GET_STATS_PREFIX = 'apiCalls.savedObjectsGet';
export const UPDATE_STATS_PREFIX = 'apiCalls.savedObjectsUpdate';
export const IMPORT_STATS_PREFIX = 'apiCalls.savedObjectsImport';
export const RESOLVE_IMPORT_STATS_PREFIX = 'apiCalls.savedObjectsResolveImportErrors';
export const EXPORT_STATS_PREFIX = 'apiCalls.savedObjectsExport';
const ALL_COUNTER_FIELDS = [
  // Saved Objects Client APIs
  ...getFieldsForCounter(BULK_CREATE_STATS_PREFIX),
  ...getFieldsForCounter(BULK_GET_STATS_PREFIX),
  ...getFieldsForCounter(BULK_UPDATE_STATS_PREFIX),
  ...getFieldsForCounter(CREATE_STATS_PREFIX),
  ...getFieldsForCounter(DELETE_STATS_PREFIX),
  ...getFieldsForCounter(FIND_STATS_PREFIX),
  ...getFieldsForCounter(GET_STATS_PREFIX),
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
  `${EXPORT_STATS_PREFIX}.allTypesSelected.yes`,
  `${EXPORT_STATS_PREFIX}.allTypesSelected.no`,
];
const SPACE_CONTEXT_REGEX = /^\/s\/([a-z0-9_\-]+)/;

/** @internal */
export class CoreUsageStatsClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly basePath: IBasePath,
    private readonly repositoryPromise: Promise<ISavedObjectsRepository>
  ) {}

  public async getUsageStats() {
    this.debugLogger('getUsageStats() called');
    let coreUsageStats: CoreUsageStats = {};
    try {
      const repository = await this.repositoryPromise;
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

  public async incrementSavedObjectsBulkUpdate(options: BaseIncrementOptions) {
    await this.updateUsageStats([], BULK_UPDATE_STATS_PREFIX, options);
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

  public async incrementSavedObjectsUpdate(options: BaseIncrementOptions) {
    await this.updateUsageStats([], UPDATE_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsImport(options: IncrementSavedObjectsImportOptions) {
    const { createNewCopies, overwrite } = options;
    const counterFieldNames = [
      `createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`,
      `overwriteEnabled.${overwrite ? 'yes' : 'no'}`,
    ];
    await this.updateUsageStats(counterFieldNames, IMPORT_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsResolveImportErrors(
    options: IncrementSavedObjectsResolveImportErrorsOptions
  ) {
    const { createNewCopies } = options;
    const counterFieldNames = [`createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`];
    await this.updateUsageStats(counterFieldNames, RESOLVE_IMPORT_STATS_PREFIX, options);
  }

  public async incrementSavedObjectsExport(options: IncrementSavedObjectsExportOptions) {
    const { types, supportedTypes } = options;
    const isAllTypesSelected = !!types && supportedTypes.every((x) => types.includes(x));
    const counterFieldNames = [`allTypesSelected.${isAllTypesSelected ? 'yes' : 'no'}`];
    await this.updateUsageStats(counterFieldNames, EXPORT_STATS_PREFIX, options);
  }

  private async updateUsageStats(
    counterFieldNames: string[],
    prefix: string,
    { request }: BaseIncrementOptions
  ) {
    const options = { refresh: false };
    try {
      const repository = await this.repositoryPromise;
      const fields = this.getFieldsToIncrement(counterFieldNames, prefix, request);
      await repository.incrementCounter(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        fields,
        options
      );
    } catch (err) {
      // do nothing
    }
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
  // The presence of these two request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  return headers && headers['kbn-version'] && headers.referer;
}
