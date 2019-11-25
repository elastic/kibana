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
import { SavedObject } from 'ui/saved_objects/types';
import { IIndexPattern } from '../../../../../plugins/data/common/index_patterns';
import { IndexPatterns } from '../../../../core_plugins/data/public/index_patterns/index_patterns';

/**
 * After creation or fetching from ES, ensure that the searchSources index indexPattern
 * is an bonafide IndexPattern object.
 *
 * @return {Promise<IndexPattern | null>}
 */
export function hydrateIndexPattern(
  id: string,
  savedObject: SavedObject,
  clearSavedIndexPattern: boolean,
  indexPattern: IIndexPattern,
  indexPatterns: IndexPatterns
) {
  if (!savedObject.searchSource) {
    return Promise.resolve(null);
  }

  if (clearSavedIndexPattern) {
    savedObject.searchSource!.setField('index', null);
    return Promise.resolve(null);
  }

  let index = id || indexPattern || savedObject.searchSource!.getOwnField('index');

  if (!index) {
    return Promise.resolve(null);
  }

  // If index is not an IndexPattern object at savedObject point, then it's a string id of an index.
  if (typeof index === 'string') {
    index = indexPatterns.get(index);
  }

  // At savedObject point index will either be an IndexPattern, if cached, or a promise that
  // will return an IndexPattern, if not cached.
  return Promise.resolve(index).then((ip: IIndexPattern) => {
    savedObject.searchSource!.setField('index', ip);
  });
}
