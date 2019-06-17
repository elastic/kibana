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

import chrome from 'ui/chrome';
// @ts-ignore
import { mockFields, mockIndexPattern } from 'ui/index_patterns/fixtures';
// @ts-ignore
import { INDEX_PATTERN_ILLEGAL_CHARACTERS } from 'ui/index_patterns/index';
// @ts-ignore
import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/index_patterns/index';
// @ts-ignore
import { IndexPatternSelect } from 'ui/index_patterns/index';
// @ts-ignore
import { IndexPatterns } from 'ui/index_patterns/index';
// @ts-ignore
import { validateIndexPattern } from 'ui/index_patterns/index';

// IndexPattern, StaticIndexPattern, StaticIndexPatternField, Field
import * as types from 'ui/index_patterns';

const config = chrome.getUiSettingsClient();
const savedObjectsClient = chrome.getSavedObjectsClient();
const basePath = chrome.getBasePath();
/**
 * Index Patterns Service
 *
 * The `setup` method of this service returns the public contract for
 * index patterns. Right now these APIs are simply imported from `ui/public`
 * and re-exported here. Once the index patterns code actually moves to
 * this plugin, the imports above can simply be updated to point to their
 * corresponding local directory.
 *
 * @internal
 */
export class IndexPatternsService {
  public setup() {
    return {
      indexPatterns: new IndexPatterns(basePath, config, savedObjectsClient),
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

// static exports

const constants = {
  INDEX_PATTERN_ILLEGAL_CHARACTERS,
  INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE,
};

const fixtures = {
  mockFields,
  mockIndexPattern,
};

const ui = {
  IndexPatternSelect,
};

export { validateIndexPattern, constants, fixtures, ui };

/** @public */
export type IndexPatternsSetup = ReturnType<IndexPatternsService['setup']>;

/** @public */
export type IndexPattern = types.IndexPattern;

/** @public */
export type StaticIndexPattern = types.StaticIndexPattern;

/** @public */
export type StaticIndexPatternField = types.StaticIndexPatternField;

/** @public */
export type Field = types.Field;
