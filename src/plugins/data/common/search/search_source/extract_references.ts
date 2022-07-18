/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { Filter } from '@kbn/es-query';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { SerializedSearchSourceFields } from './types';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../..';

export const extractReferences = (
  state: SerializedSearchSourceFields
): [SerializedSearchSourceFields, SavedObjectReference[]] => {
  let searchSourceFields: SerializedSearchSourceFields & { indexRefName?: string } = { ...state };
  const references: SavedObjectReference[] = [];
  if (searchSourceFields.index) {
    if (typeof searchSourceFields.index === 'string') {
      const indexId = searchSourceFields.index;
      const refName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
      references.push({
        name: refName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: indexId,
      });
      searchSourceFields = {
        ...searchSourceFields,
        indexRefName: refName,
        index: undefined,
      };
    } else {
      const { state: dataViewState, references: dataViewReferences } =
        DataViewPersistableStateService.extract(searchSourceFields.index);
      searchSourceFields.index = dataViewState;
      references.push(...dataViewReferences);
    }
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
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
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
