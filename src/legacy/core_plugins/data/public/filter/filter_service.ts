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

import { IndexPatterns } from '../index_patterns';
import { FilterManager } from './filter_manager';
/**
 * FilterSearch Service
 * @internal
 */

export interface FilterServiceDependencies {
  indexPatterns: IndexPatterns;
}

export class FilterService {
  public setup({ indexPatterns }: FilterServiceDependencies) {
    const filterManager = new FilterManager(indexPatterns);

    return {
      filterManager,
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type FilterSetup = ReturnType<FilterService['setup']>;
