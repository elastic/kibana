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

import {
  UiSettingsClientContract,
  SavedObjectsClientContract,
  HttpServiceBase,
  NotificationsStart,
} from 'src/core/public';
import { Field, FieldList, FieldListInterface, FieldType } from './fields';
import { createIndexPatternSelect } from './components';
import { setNotifications } from './services';

import {
  createFlattenHitWrapper,
  formatHitProvider,
  IndexPattern,
  IndexPatterns,
  StaticIndexPattern,
} from './index_patterns';

export interface IndexPatternDependencies {
  uiSettings: UiSettingsClientContract;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpServiceBase;
  notifications: NotificationsStart;
}

/**
 * Index Patterns Service
 *
 * @internal
 */
export class IndexPatternsService {
  private setupApi: any;

  public setup() {
    this.setupApi = {
      FieldList,
      flattenHitWrapper: createFlattenHitWrapper(),
      formatHitProvider,
      __LEGACY: {
        // For BWC we must temporarily export the class implementation of Field,
        // which is only used externally by the Index Pattern UI.
        FieldImpl: Field,
      },
    };
    return this.setupApi;
  }

  public start({ uiSettings, savedObjectsClient, http, notifications }: IndexPatternDependencies) {
    setNotifications(notifications);

    return {
      ...this.setupApi,
      indexPatterns: new IndexPatterns(uiSettings, savedObjectsClient, http),
      IndexPatternSelect: createIndexPatternSelect(savedObjectsClient),
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

// static code

/** @public */
export { IndexPatternSelect } from './components';
export {
  CONTAINS_SPACES,
  getFromSavedObject,
  getRoutes,
  ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE,
  isFilterable,
  validateIndexPattern,
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
export type IndexPatternsStart = ReturnType<IndexPatternsService['start']>;

/** @public */
export { IndexPattern, IndexPatterns, StaticIndexPattern, Field, FieldType, FieldListInterface };

/** @public */
export { getIndexPatternTitle, findIndexPatternByTitle } from './utils';
