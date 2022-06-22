/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, createAction } from '@kbn/ui-actions-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';

export const UPDATE_FILTER_REFERENCES_ACTION = 'UPDATE_FILTER_REFERENCES_ACTION';

export interface UpdateFilterReferencesActionContext {
  /** The initial data view of the editable layer **/
  fromDataView: string;
  /** New data view of of the editable layer
   *  @description null - in case of removing the layer
   */
  toDataView: string; // null in case of removing
  /** List of all Data Views used in all layers **/
  usedDataViews: string[] | [];
  /** Index to use by default if all layers are cleared **/
  defaultDataView: string;
}

export function createUpdateFilterReferencesAction(filterManager: FilterManager): Action {
  return createAction({
    type: UPDATE_FILTER_REFERENCES_ACTION,
    id: UPDATE_FILTER_REFERENCES_ACTION,
    execute: async ({
      fromDataView,
      toDataView,
      usedDataViews,
      defaultDataView,
    }: UpdateFilterReferencesActionContext) => {
      const countOfInitialDataView = usedDataViews.filter((i) => i === fromDataView).length;
      const filters = filterManager.getFilters();

      /** no action needed **/
      if (countOfInitialDataView > 1 || !filters.length || !fromDataView) {
        return;
      }

      /** removing layer **/
      if (fromDataView && !toDataView) {
        if (usedDataViews.length > 1) {
          toDataView = usedDataViews[0];
        } else {
          toDataView = defaultDataView;
        }
      }

      filterManager.updateDataViewReferences(filters, fromDataView, toDataView);
    },
  });
}
