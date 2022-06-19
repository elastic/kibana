/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Action, createAction } from '@kbn/ui-actions-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

export const ACTION_UPDATE_USED_DATA_VIEWS = 'ACTION_UPDATE_USED_DATA_VIEWS';

export interface UpdateUsedDataViewActionContext {
  initialDataView: DataView;
  newDataView: DataView | null; // null in case of removing
}

async function isCompatible(context: UpdateUsedDataViewActionContext) {
  return true;
}

export function createUpdateUsedDataViewAction(filterManager: FilterManager): Action {
  return createAction({
    type: ACTION_UPDATE_USED_DATA_VIEWS,
    id: ACTION_UPDATE_USED_DATA_VIEWS,
    order: 100,
    getIconType: () => 'filter',
    getDisplayName: () => {
      return i18n.translate('unifiedSearch.filter.updateUsedDataViewActionTitle', {
        defaultMessage: 'Update used data views',
      });
    },
    isCompatible,
    execute: async ({ initialDataView, newDataView }: UpdateUsedDataViewActionContext) => {
      console.log('dataViews', initialDataView, newDataView);
    },
  });
}
