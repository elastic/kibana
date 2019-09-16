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

import { UiSettingsClientContract, SavedObjectsClientContract } from 'src/core/public';
import { Field, FieldList, FieldType } from './fields';
import { createFlattenHitWrapper } from './index_patterns';
import { createIndexPatternSelect } from './components';
import {
  formatHitProvider,
  IndexPattern,
  IndexPatterns,
  StaticIndexPattern,
} from './index_patterns';

export interface IndexPatternDependencies {
  uiSettings: UiSettingsClientContract;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * Index Patterns Service
 *
 * @internal
 */
export class IndexPatternsService {
  public setup({ uiSettings, savedObjectsClient }: IndexPatternDependencies) {
    return {
      FieldList,
      flattenHitWrapper: createFlattenHitWrapper(),
      formatHitProvider,
      indexPatterns: new IndexPatterns(uiSettings, savedObjectsClient),
      IndexPatternSelect: createIndexPatternSelect(savedObjectsClient),
      __LEGACY: {
        // For BWC we must temporarily export the class implementation of Field,
        // which is only used externally by the Index Pattern UI.
        FieldImpl: Field,
      },
    };
  }

  public start() {
    // nothing to do here yet
  }

  public stop() {
    // nothing to do here yet
  }
}

// static code

/** @public */
export { IndexPatternSelect } from './components';
export { IndexPatternsProvider } from './index_patterns';
export {
  CONTAINS_SPACES,
  getFromSavedObject,
  getRoutes,
  ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE,
  isFilterable,
  validateIndexPattern,
  mockFields,
  mockIndexPattern,
} from './utils';

/** @public */
export {
  IndexPatternAlreadyExists,
  IndexPatternMissingIndices,
  NoDefaultIndexPattern,
  NoDefinedIndexPatterns,
} from './errors';

// types

/** @internal */
export type IndexPatternsSetup = ReturnType<IndexPatternsService['setup']>;

/** @public */
export type IndexPattern = IndexPattern;

/** @public */
export type IndexPatterns = IndexPatterns;

/** @public */
export type StaticIndexPattern = StaticIndexPattern;

/** @public */
export type Field = Field;

/** @public */
export type FieldType = FieldType;
