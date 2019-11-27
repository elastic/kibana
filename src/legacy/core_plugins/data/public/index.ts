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
import {
  IndexPattern as npIndexPattern,
  Field,
  FieldListInterface,
  IFieldType,
  FieldList,
} from '../../../../plugins/data/public';

export function plugin() {
  return new Plugin();
}

// /// Export types & static code

/** @public types */
export { DataSetup, DataStart };

export { IndexPattern, IndexPatterns, StaticIndexPattern } from './index_patterns';
export { QueryStringInput } from './query';
export { SearchBar, SearchBarProps, SavedQueryAttributes, SavedQuery } from './search';

/** @public static code */
export * from '../common';
export { FilterStateManager } from './filter/filter_manager';

const CONTAINS_SPACES = npIndexPattern.CONTAINS_SPACES_KEY;
const getFromSavedObject = npIndexPattern.getFromSavedObject;
const getRoutes = npIndexPattern.getRoutes;
const validateIndexPattern = npIndexPattern.validate;
const findIndexPatternByTitle = npIndexPattern.findByTitle;
const IndexPatternAlreadyExists = npIndexPattern.errors.AlreadyExists;
const IndexPatternMissingIndices = npIndexPattern.errors.MissingIndices;
const NoDefaultIndexPattern = npIndexPattern.errors.NoDefault;
const NoDefinedIndexPatterns = npIndexPattern.errors.NoDefined;
const ILLEGAL_CHARACTERS = npIndexPattern.ILLEGAL_CHARACTERS_KEY;
const INDEX_PATTERN_ILLEGAL_CHARACTERS = npIndexPattern.ILLEGAL_CHARACTERS;
const INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE = npIndexPattern.ILLEGAL_CHARACTERS_VISIBLE;

export { IFieldType as FieldType };

export {
  CONTAINS_SPACES,
  getFromSavedObject,
  getRoutes,
  validateIndexPattern,
  findIndexPatternByTitle,
  ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE,
  IndexPatternAlreadyExists,
  IndexPatternMissingIndices,
  NoDefaultIndexPattern,
  NoDefinedIndexPatterns,
  Field,
  FieldListInterface,
  FieldList,
};
