/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { migrateLegacyQuery } from './migrate_legacy_query';
import { SearchSource, SearchSourceDependencies } from './search_source';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';
import { SearchSourceFields, SearchSourceFieldsSerializable } from './types';
import { AggsCommonStart } from '../aggs';

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
  aggs: AggsCommonStart,
  searchSourceDependencies: SearchSourceDependencies
) => async (searchSourceFields: SearchSourceFieldsSerializable = {}) => {
  const index = await indexPatterns.get(searchSourceFields.index as any);

  const convertFields = (serializedFields: SearchSourceFieldsSerializable): SearchSourceFields => {
    return {
      ...serializedFields,
      index: serializedFields.index ? index : undefined,
      aggs: aggs.createAggConfigs(index, searchSourceFields.aggs as any),
      parent: serializedFields.parent ? convertFields(serializedFields.parent) : undefined,
    };
  };
  const fields: SearchSourceFields = convertFields(searchSourceFields);
  const searchSource = new SearchSource(fields, searchSourceDependencies);

  // todo: move to migration script .. create issue
  const query = searchSource.getOwnField('query');

  if (typeof query !== 'undefined') {
    searchSource.setField('query', migrateLegacyQuery(query));
  }

  return searchSource;
};
