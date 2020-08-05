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
import { migrateLegacyQuery } from '../../../../kibana_legacy/public';
import { SearchSource, SearchSourceDependencies } from './search_source';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';
import { SearchSourceFields } from './types';

/**
 * Deserializes a json string and a set of referenced objects to a `SearchSource` instance.
 * Use this method to re-create the search source serialized using `searchSource.serialize`.
 *
 * This function is a factory function that returns the actual utility when calling it with the
 * required service dependency (index patterns contract). A pre-wired version is also exposed in
 * the start contract of the data plugin as part of the search service
 *
 * @param indexPatterns The index patterns contract of the data plugin
 * @param searchSourceDependencies
 *
 * @return Wired utility function taking two parameters `searchSourceJson`, the json string
 * returned by `serializeSearchSource` and `references`, a list of references including the ones
 * returned by `serializeSearchSource`.
 *
 *
 * @public */
export const createSearchSource = (
  indexPatterns: IndexPatternsContract,
  searchSourceDependencies: SearchSourceDependencies
) => async (searchSourceFields: SearchSourceFields = {}) => {
  const fields = { ...searchSourceFields };

  // hydrating index pattern
  if (fields.index && typeof fields.index === 'string') {
    fields.index = await indexPatterns.get(searchSourceFields.index as any);
  }

  const searchSource = new SearchSource(fields, searchSourceDependencies);

  // todo: move to migration script .. create issue
  const query = searchSource.getOwnField('query');

  if (typeof query !== 'undefined') {
    searchSource.setField('query', migrateLegacyQuery(query));
  }

  return searchSource;
};
