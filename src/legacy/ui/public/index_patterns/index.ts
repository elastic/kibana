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

/**
 * Nothing to see here!
 *
 * Index Patterns have moved to the data plugin, and are being re-exported
 * from ui/index_patterns for backwards compatibility.
 */

import { setup as data } from '../../../core_plugins/data/public/legacy';

export const {
  FieldList, // only used in Discover and StubIndexPattern
  flattenHitWrapper,
  formatHitProvider,
  IndexPatternSelect, // only used in x-pack/plugin/maps and input control vis
} = data.indexPatterns;

// static code
export {
  CONTAINS_SPACES,
  getFromSavedObject,
  getRoutes,
  isFilterable,
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
} from '../../../core_plugins/data/public';

// types
export {
  Field,
  FieldType,
  IndexPattern,
  IndexPatterns,
  StaticIndexPattern,
} from '../../../core_plugins/data/public';
