/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionExecutionMeta, UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';

export const UPDATE_FILTER_REFERENCES_ACTION = 'UPDATE_FILTER_REFERENCES_ACTION';

export interface UpdateFilterReferencesActionContext extends ActionExecutionMeta {
  /** The initial data view of the editable layer **/
  fromDataView: string;
  /** New data view of the editable layer
   *  @description undefined - in case of removing the layer
   */
  toDataView?: string | undefined;
  /** List of all Data Views used in all layers **/
  usedDataViews: string[] | [];
  /** Index to use by default if all layers are cleared **/
  defaultDataView?: string;
}

export function createUpdateFilterReferencesAction(
  filterManager: FilterManager
): UiActionsActionDefinition<UpdateFilterReferencesActionContext> {
  return {
    type: UPDATE_FILTER_REFERENCES_ACTION,
    id: UPDATE_FILTER_REFERENCES_ACTION,
    execute: async ({ fromDataView, toDataView, usedDataViews, defaultDataView }) => {
      const countOfInitialDataView = usedDataViews.filter((i) => i === fromDataView).length;
      const filters = filterManager.getFilters();

      /** no action needed **/
      if (countOfInitialDataView > 1 || !filters.length || !fromDataView) {
        return;
      }

      /** removing layer **/
      if (fromDataView && !toDataView) {
        if (usedDataViews.length > 1) {
          toDataView = usedDataViews.filter((item) => item !== fromDataView)[0];
        }
        if (!toDataView && defaultDataView) {
          toDataView = defaultDataView;
        }
      }

      if (toDataView) {
        filterManager.setFilters(
          filters.map((filter) => {
            if (filter.meta.index === fromDataView) {
              return {
                ...filter,
                meta: {
                  ...filter.meta,
                  index: toDataView,
                },
              };
            } else {
              return filter;
            }
          })
        );
      }
    },
  };
}
