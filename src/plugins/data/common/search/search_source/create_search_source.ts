/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { migrateLegacyQuery } from './migrate_legacy_query';
import { SearchSource, SearchSourceDependencies } from './search_source';
import { SerializedSearchSourceFields } from '../..';
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
  indexPatterns: DataViewsContract,
  searchSourceDependencies: SearchSourceDependencies
) => {
  const createFields = async (
    searchSourceFields: SerializedSearchSourceFields = {},
    useDataViewLazy = false
  ) => {
    const { index, parent, ...restOfFields } = searchSourceFields;
    const fields: SearchSourceFields = {
      ...restOfFields,
    };

    // hydrating index pattern
    if (searchSourceFields.index) {
      if (!useDataViewLazy) {
        if (typeof searchSourceFields.index === 'string') {
          fields.index = await indexPatterns.get(searchSourceFields.index);
        } else {
          fields.index = await indexPatterns.create(searchSourceFields.index);
        }
      }
    }

    if (searchSourceFields.parent) {
      fields.parent = await createFields(searchSourceFields.parent);
    }

    return fields;
  };

  const createSearchSourceFn = async (
    searchSourceFields: SerializedSearchSourceFields = {},
    useDataViewLazy: boolean
  ) => {
    const fields = await createFields(searchSourceFields, useDataViewLazy);
    const searchSource = new SearchSource(fields, searchSourceDependencies);

    // todo: move to migration script .. create issue
    const query = searchSource.getOwnField('query');

    if (typeof query !== 'undefined') {
      searchSource.setField('query', migrateLegacyQuery(query));
    }
    if (useDataViewLazy && searchSourceFields.index) {
      const dataViewLazy =
        typeof searchSourceFields.index === 'string'
          ? await indexPatterns.getDataViewLazy(searchSourceFields.index)
          : await indexPatterns.createDataViewLazy(searchSourceFields.index);

      const indexPattern =
        typeof searchSourceFields.index === 'object'
          ? await indexPatterns.create(searchSourceFields.index, true)
          : await indexPatterns.get(searchSourceFields.index, false, false);
      const lazyFields = await searchSource.loadDataViewFields(dataViewLazy);
      if (lazyFields) {
        indexPattern.fields.replaceAll(lazyFields);
      }
      searchSource.setField('index', indexPattern);
    }

    return searchSource;
  };

  return createSearchSourceFn;
};
