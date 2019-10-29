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

// /// Define plugin function
import { DataPlugin as Plugin, DataSetup, DataStart } from './plugin';

export function plugin() {
  return new Plugin();
}

// /// Export types & static code

/** @public types */
export { DataSetup, DataStart };

export { FilterBar, ApplyFiltersPopover } from './filter';
export {
  Field,
  FieldType,
  FieldListInterface,
  IndexPattern,
  IndexPatterns,
  StaticIndexPattern,
} from './index_patterns';
export { Query, QueryBarInput } from './query';
export { SearchBar, SearchBarProps, SavedQueryAttributes, SavedQuery } from './search';

/** @public static code */
export * from '../common';
export { FilterStateManager } from './filter/filter_manager';
export {
  CONTAINS_SPACES,
  getFromSavedObject,
  getRoutes,
  isFilterable,
  IndexPatternSelect,
  validateIndexPattern,
  ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE,
  IndexPatternAlreadyExists,
  IndexPatternMissingIndices,
  NoDefaultIndexPattern,
  NoDefinedIndexPatterns,
  mockFields,
  mockIndexPattern,
} from './index_patterns';

export {
  TimeHistoryContract,
  TimefilterContract,
  getTime,
  InputTimeRange,
  extractTimeFilter,
  changeTimeFilter,
} from './timefilter';
