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

import { CoreStart } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { FilterManager } from './filter_manager';
import { TimefilterService, TimefilterSetup } from './timefilter';
import { createSavedQueryService } from './saved_query/saved_query_service';

/**
 * Query Service
 * @internal
 */

export interface QueryServiceDependencies {
  storage: IStorageWrapper;
  uiSettings: CoreStart['uiSettings'];
}
export class QueryService {
  filterManager!: FilterManager;
  timefilter!: TimefilterSetup;

  public setup({ uiSettings, storage }: QueryServiceDependencies) {
    this.filterManager = new FilterManager(uiSettings);

    const timefilterService = new TimefilterService();
    this.timefilter = timefilterService.setup({
      uiSettings,
      storage,
    });

    return {
      filterManager: this.filterManager,
      timefilter: this.timefilter,
    };
  }

  public start(savedObjects: CoreStart['savedObjects']) {
    return {
      filterManager: this.filterManager,
      timefilter: this.timefilter,
      savedQueries: createSavedQueryService(savedObjects.client),
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type QuerySetup = ReturnType<QueryService['setup']>;
export type QueryStart = ReturnType<QueryService['start']>;
