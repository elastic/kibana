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
import { SavedObject, SavedObjectConfig } from '../types';
import { IndexPatternsContract } from '../../../../../plugins/data/public';

/**
 * After creation or fetching from ES, ensure that the searchSources index indexPattern
 * is an bonafide IndexPattern object.
 *
 * @return {Promise<IndexPattern | null>}
 */
export async function hydrateIndexPattern(
  id: string,
  savedObject: SavedObject,
  indexPatterns: IndexPatternsContract,
  config: SavedObjectConfig
) {
  const clearSavedIndexPattern = !!config.clearSavedIndexPattern;
  const indexPattern = config.indexPattern;

  if (!savedObject.searchSource) {
    return null;
  }

  if (clearSavedIndexPattern) {
    savedObject.searchSource!.setField('index', undefined);
    return null;
  }

  const index = id || indexPattern || savedObject.searchSource!.getOwnField('index');

  if (typeof index !== 'string' || !index) {
    return null;
  }

  const indexObj = await indexPatterns.get(index);
  savedObject.searchSource!.setField('index', indexObj);
  return indexObj;
}
