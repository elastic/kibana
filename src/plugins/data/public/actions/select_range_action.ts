/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ActionByType,
  APPLY_FILTER_TRIGGER,
  createAction,
  UiActionsStart,
} from '../../../../plugins/ui_actions/public';
import { createFiltersFromRangeSelectAction } from './filters/create_filters_from_range_select';
import type { RangeSelectContext } from '../../../embeddable/public';

export type SelectRangeActionContext = RangeSelectContext;

export const ACTION_SELECT_RANGE = 'ACTION_SELECT_RANGE';

export function createSelectRangeAction(
  getStartServices: () => { uiActions: UiActionsStart }
): ActionByType<typeof ACTION_SELECT_RANGE> {
  return createAction<typeof ACTION_SELECT_RANGE>({
    type: ACTION_SELECT_RANGE,
    id: ACTION_SELECT_RANGE,
    shouldAutoExecute: async () => true,
    execute: async (context: SelectRangeActionContext) => {
      try {
        const filters = await createFiltersFromRangeSelectAction(context.data);
        if (filters.length > 0) {
          await getStartServices().uiActions.getTrigger(APPLY_FILTER_TRIGGER).exec({
            filters,
            embeddable: context.embeddable,
            timeFieldName: context.data.timeFieldName,
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`Error [ACTION_SELECT_RANGE]: can\'t extract filters from action context`);
      }
    },
  });
}
