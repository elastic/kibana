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
  SavedObjectsExportOptions,
  KibanaRequest,
  IBasePath,
} from '..';

interface BaseIncrementOptions {
  request: KibanaRequest;
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
  // Saved Objects Management APIs
  ...getAllCommonFields(IMPORT_STATS_PREFIX),
  `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
  `${IMPORT_STATS_PREFIX}.overwriteEnabled.yes`,
  `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`,
  ...getAllCommonFields(RESOLVE_IMPORT_STATS_PREFIX),
  `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
  `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
  ...getAllCommonFields(EXPORT_STATS_PREFIX),
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
      const fields = [...this.getCommonFieldsToIncrement(request), ...counterFieldNames];
      await repository.incrementCounter(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        fields.map((x) => `${prefix}.${x}`),
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

  private getCommonFieldsToIncrement(request: KibanaRequest) {
    const isKibanaRequest = getIsKibanaRequest(request);
    const isDefaultNamespace = this.getIsDefaultNamespace(request);
    const namespaceField = isDefaultNamespace ? 'default' : 'custom';
    const counterFieldNames = [
      'total',
      `namespace.${namespaceField}.total`,
      `namespace.${namespaceField}.kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
    ];
    return counterFieldNames;
  }
}

function getAllCommonFields(prefix: string) {
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
  // The presence of these three request headers gives us a good indication that this is a first-party request from the Kibana client.
  // We can't be 100% certain, but this is a reasonable attempt.
  return headers && headers['kbn-version'] && headers.origin && headers.referer;
}
