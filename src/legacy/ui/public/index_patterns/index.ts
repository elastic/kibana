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

/* eslint-disable @kbn/eslint/no-restricted-paths */
export {
  mockFields,
  mockIndexPattern,
} from '../../../core_plugins/data/public/index_patterns/index_patterns_service.mock';
/* eslint-enable @kbn/eslint/no-restricted-paths */

// Field is only used as class in Index Patterns Management UI.
// FieldList is only used in discover and StubIndexPattern.
export const { FieldList, flattenHitWrapper, formatHitProvider } = data.indexPatterns;
export const { IndexPatternsProvider } = data.indexPatterns.__LEGACY;

// ui components
export const { IndexPatternSelect } = data.indexPatterns.ui;

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
} from '../../../core_plugins/data/public';

// types
export {
  Field,
  FieldType,
  IndexPattern,
  IndexPatterns,
  StaticIndexPattern,
} from '../../../core_plugins/data/public';
