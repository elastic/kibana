/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, ActionExecutionMeta, createAction } from '@kbn/ui-actions-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';
import { getFilterReferencesUpdater, type UpdateFilterReferencesParams } from '../../common';

export const UPDATE_FILTER_REFERENCES_ACTION = 'UPDATE_FILTER_REFERENCES_ACTION';

export type UpdateFilterReferencesActionContext = ActionExecutionMeta &
  UpdateFilterReferencesParams;

export function createUpdateFilterReferencesAction(filterManager: FilterManager): Action {
  return createAction<UpdateFilterReferencesActionContext>({
    type: UPDATE_FILTER_REFERENCES_ACTION,
    id: UPDATE_FILTER_REFERENCES_ACTION,
    execute: async (context: UpdateFilterReferencesActionContext) => {
      const getUpdatedFilterReferences = getFilterReferencesUpdater(filterManager.getFilters());
      const updatedFilters = getUpdatedFilterReferences(context);
      if (context.toDataView && updatedFilters) {
        filterManager.setFilters(updatedFilters);
      }
    },
  });
}
