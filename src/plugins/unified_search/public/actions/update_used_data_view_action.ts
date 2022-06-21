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
  usedDataViews: string[] | [];
}

export function createUpdateUsedDataViewAction(filterManager: FilterManager): Action {
  return createAction({
    type: ACTION_UPDATE_USED_DATA_VIEWS,
    id: ACTION_UPDATE_USED_DATA_VIEWS,
    execute: async ({
      initialDataView,
      newDataView,
      usedDataViews,
    }: UpdateUsedDataViewActionContext) => {
      const countOfInitialDataView = usedDataViews.filter((i) => i === initialDataView).length;
      const filters = filterManager.getFilters();

      /** no action needed **/
      if (countOfInitialDataView > 1 || !filters.length || !initialDataView) {
        return;
      }

      /** removing layer **/
      if (initialDataView && !newDataView) {
        if (usedDataViews.length > 1) {
          newDataView = usedDataViews[0];
        } else {
          newDataView = '@todo'; // <= for that case Unified Search Data view should be used
        }
      }

      filterManager.updateDataViewReferences(filters, initialDataView, newDataView);
    },
  });
}
