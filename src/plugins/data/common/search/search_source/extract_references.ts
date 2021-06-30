/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from 'src/core/types';
import { Filter } from '../../es_query/filters';
import { SearchSourceFields } from './types';

import { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../../constants';

export const extractReferences = (
  state: SearchSourceFields
): [SearchSourceFields & { indexRefName?: string }, SavedObjectReference[]] => {
  let searchSourceFields: SearchSourceFields & { indexRefName?: string } = { ...state };
  const references: SavedObjectReference[] = [];
  if (searchSourceFields.index) {
    const indexId = searchSourceFields.index.id || ((searchSourceFields.index as any) as string);
    const refName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    references.push({
      name: refName,
      type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
      id: indexId,
    });
    searchSourceFields = {
      ...searchSourceFields,
      indexRefName: refName,
      index: undefined,
    };
  }

  if (searchSourceFields.filter) {
    searchSourceFields = {
      ...searchSourceFields,
      filter: (searchSourceFields.filter as Filter[]).map((filterRow, i) => {
        if (!filterRow.meta || !filterRow.meta.index) {
          return filterRow;
        }
        const refName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
        references.push({
          name: refName,
          type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
          id: filterRow.meta.index,
        });
        return {
          ...filterRow,
          meta: {
            ...filterRow.meta,
            indexRefName: refName,
            index: undefined,
          },
        };
      }),
    };
  }

  return [searchSourceFields, references];
};
