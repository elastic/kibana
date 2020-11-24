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

import { CORE_USAGE_STATS_TYPE } from './constants';
import { CoreUsageStats } from './types';
import {
  ISavedObjectsRepository,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsExportOptions,
} from '..';

/** @internal */
export type IncrementSavedObjectsImportOptions = Pick<
  SavedObjectsImportOptions,
  'createNewCopies' | 'overwrite'
>;
/** @internal */
export type IncrementSavedObjectsResolveImportErrorsOptions = Pick<
  SavedObjectsResolveImportErrorsOptions,
  'createNewCopies'
>;
/** @internal */
export type IncrementSavedObjectsExportOptions = Pick<SavedObjectsExportOptions, 'types'> & {
  supportedTypes: string[];
};

const SAVED_OBJECTS_IMPORT_DEFAULT = Object.freeze({
  total: 0,
  createNewCopies: Object.freeze({ enabled: 0, disabled: 0 }),
  overwrite: Object.freeze({ enabled: 0, disabled: 0 }),
});
const SAVED_OBJECTS_RESOLVE_IMPORT_ERRORS_DEFAULT = Object.freeze({
  total: 0,
  createNewCopies: Object.freeze({ enabled: 0, disabled: 0 }),
});
const SAVED_OBJECTS_EXPORT_DEFAULT = Object.freeze({
  total: 0,
  allTypes: Object.freeze({ yes: 0, no: 0 }),
});

/** @internal */
export class CoreUsageStatsClient {
  constructor(
    private readonly debugLogger: (message: string) => void,
    private readonly repository: ISavedObjectsRepository
  ) {}

  public async getUsageStats() {
    this.debugLogger('getUsageStats() called');
    let coreUsageStats: CoreUsageStats = {};
    try {
      const result = await this.repository.get<CoreUsageStats>(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_TYPE
      );
      coreUsageStats = result.attributes;
    } catch (err) {
      // do nothing
    }
    return coreUsageStats;
  }

  public async incrementSavedObjectsImport({
    createNewCopies,
    overwrite,
  }: IncrementSavedObjectsImportOptions) {
    const coreUsageStats = await this.getUsageStats();
    const { apiCalls = {} } = coreUsageStats;
    const { savedObjectsImport: current = SAVED_OBJECTS_IMPORT_DEFAULT } = apiCalls;

    const attributes = {
      ...coreUsageStats,
      apiCalls: {
        ...apiCalls,
        savedObjectsImport: {
          total: current.total + 1,
          createNewCopies: incrementBooleanCount(current.createNewCopies, createNewCopies),
          overwrite: incrementBooleanCount(current.overwrite, overwrite),
        },
      },
    };
    await this.updateUsageStats(attributes);
  }

  public async incrementSavedObjectsResolveImportErrors({
    createNewCopies,
  }: IncrementSavedObjectsResolveImportErrorsOptions) {
    const coreUsageStats = await this.getUsageStats();
    const { apiCalls = {} } = coreUsageStats;
    const {
      savedObjectsResolveImportErrors: current = SAVED_OBJECTS_RESOLVE_IMPORT_ERRORS_DEFAULT,
    } = apiCalls;

    const attributes = {
      ...coreUsageStats,
      apiCalls: {
        ...apiCalls,
        savedObjectsResolveImportErrors: {
          total: current.total + 1,
          createNewCopies: incrementBooleanCount(current.createNewCopies, createNewCopies),
        },
      },
    };
    await this.updateUsageStats(attributes);
  }

  public async incrementSavedObjectsExport({
    types,
    supportedTypes,
  }: IncrementSavedObjectsExportOptions) {
    const coreUsageStats = await this.getUsageStats();
    const { apiCalls = {} } = coreUsageStats;
    const { savedObjectsExport: current = SAVED_OBJECTS_EXPORT_DEFAULT } = apiCalls;
    const isAllTypesSelected = !!types && supportedTypes.every((x) => types.includes(x));

    const attributes = {
      ...coreUsageStats,
      apiCalls: {
        ...apiCalls,
        savedObjectsExport: {
          total: current.total + 1,
          allTypes: {
            yes: current.allTypes.yes + (isAllTypesSelected ? 1 : 0),
            no: current.allTypes.no + (isAllTypesSelected ? 0 : 1),
          },
        },
      },
    };
    await this.updateUsageStats(attributes);
  }

  private async updateUsageStats(attributes: CoreUsageStats) {
    const options = { id: CORE_USAGE_STATS_TYPE, overwrite: true };
    return this.repository.create(CORE_USAGE_STATS_TYPE, attributes, options);
  }
}

function incrementBooleanCount(current: { enabled: number; disabled: number }, value: boolean) {
  return {
    enabled: current.enabled + (value ? 1 : 0),
    disabled: current.disabled + (value ? 0 : 1),
  };
}
