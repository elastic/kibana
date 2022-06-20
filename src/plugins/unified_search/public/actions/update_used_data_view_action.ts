/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, createAction } from '@kbn/ui-actions-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';

export const ACTION_UPDATE_USED_DATA_VIEWS = 'ACTION_UPDATE_USED_DATA_VIEWS';

export interface UpdateUsedDataViewActionContext {
  initialDataView: string;
  newDataView: string; // null in case of removing
}

export function createUpdateUsedDataViewAction(filterManager: FilterManager): Action {
  return createAction({
    type: ACTION_UPDATE_USED_DATA_VIEWS,
    id: ACTION_UPDATE_USED_DATA_VIEWS,
    execute: async ({ initialDataView, newDataView }: UpdateUsedDataViewActionContext) => {
      const filters = filterManager.getFilters();
      const changedIndexIdFilters = filters.map((filter) => {
        if (filter.meta.index === initialDataView) {
          return {
            ...filter,
            meta: {
              ...filter.meta,
              index: newDataView,
            },
          };
        } else {
          return filter;
        }
      });
      filterManager.setFilters(changedIndexIdFilters);
    },
  });
}
