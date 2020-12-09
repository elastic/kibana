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
import {
  Headers,
  ISavedObjectsRepository,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsExportOptions,
} from '..';

interface BaseIncrementOptions {
  headers?: Headers;
}
/** @internal */
export type IncrementSavedObjectsImportOptions = BaseIncrementOptions &
  Pick<SavedObjectsImportOptions, 'createNewCopies' | 'overwrite'>;
/** @internal */
export type IncrementSavedObjectsResolveImportErrorsOptions = BaseIncrementOptions &
  Pick<SavedObjectsResolveImportErrorsOptions, 'createNewCopies'>;
/** @internal */
export type IncrementSavedObjectsExportOptions = BaseIncrementOptions &
  Pick<SavedObjectsExportOptions, 'types'> & { supportedTypes: string[] };

export const IMPORT_STATS_PREFIX = 'apiCalls.savedObjectsImport';
export const RESOLVE_IMPORT_STATS_PREFIX = 'apiCalls.savedObjectsResolveImportErrors';
export const EXPORT_STATS_PREFIX = 'apiCalls.savedObjectsExport';
const ALL_COUNTER_FIELDS = [
  `${IMPORT_STATS_PREFIX}.total`,
  `${IMPORT_STATS_PREFIX}.kibanaRequest.yes`,
  `${IMPORT_STATS_PREFIX}.kibanaRequest.no`,
  `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
  `${IMPORT_STATS_PREFIX}.overwriteEnabled.yes`,
  `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`,
  `${RESOLVE_IMPORT_STATS_PREFIX}.total`,
  `${RESOLVE_IMPORT_STATS_PREFIX}.kibanaRequest.yes`,
  `${RESOLVE_IMPORT_STATS_PREFIX}.kibanaRequest.no`,
  `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
  `${EXPORT_STATS_PREFIX}.total`,
  `${EXPORT_STATS_PREFIX}.kibanaRequest.yes`,
  `${EXPORT_STATS_PREFIX}.kibanaRequest.no`,
  `${EXPORT_STATS_PREFIX}.allTypesSelected.yes`,
  `${EXPORT_STATS_PREFIX}.allTypesSelected.no`,
];

/** @internal */
export class CoreUsageStatsClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
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

  public async incrementSavedObjectsImport({
    headers,
    createNewCopies,
    overwrite,
  }: IncrementSavedObjectsImportOptions) {
    const isKibanaRequest = getIsKibanaRequest(headers);
    const counterFieldNames = [
      'total',
      `kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
      `createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`,
      `overwriteEnabled.${overwrite ? 'yes' : 'no'}`,
    ];
    await this.updateUsageStats(counterFieldNames, IMPORT_STATS_PREFIX);
  }

  public async incrementSavedObjectsResolveImportErrors({
    headers,
    createNewCopies,
  }: IncrementSavedObjectsResolveImportErrorsOptions) {
    const isKibanaRequest = getIsKibanaRequest(headers);
    const counterFieldNames = [
      'total',
      `kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
      `createNewCopiesEnabled.${createNewCopies ? 'yes' : 'no'}`,
    ];
    await this.updateUsageStats(counterFieldNames, RESOLVE_IMPORT_STATS_PREFIX);
  }

  public async incrementSavedObjectsExport({
    headers,
    types,
    supportedTypes,
  }: IncrementSavedObjectsExportOptions) {
    const isKibanaRequest = getIsKibanaRequest(headers);
    const isAllTypesSelected = !!types && supportedTypes.every((x) => types.includes(x));
    const counterFieldNames = [
      'total',
      `kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
      `allTypesSelected.${isAllTypesSelected ? 'yes' : 'no'}`,
    ];
    await this.updateUsageStats(counterFieldNames, EXPORT_STATS_PREFIX);
  }

  private async updateUsageStats(counterFieldNames: string[], prefix: string) {
    const options = { refresh: false };
    try {
      const repository = await this.repositoryPromise;
      await repository.incrementCounter(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        counterFieldNames.map((x) => `${prefix}.${x}`),
        options
      );
    } catch (err) {
      // do nothing
    }
  }
}

function getIsKibanaRequest(headers?: Headers) {
  // The presence of these three request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  return headers && headers['kbn-version'] && headers.origin && headers.referer;
}
