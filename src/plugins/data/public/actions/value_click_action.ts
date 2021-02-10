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
import { createFiltersFromValueClickAction } from './filters/create_filters_from_value_click';
import type { Filter } from '../../common/es_query/filters';
import type { ValueClickContext } from '../../../embeddable/public';

export type ValueClickActionContext = ValueClickContext;
export const ACTION_VALUE_CLICK = 'ACTION_VALUE_CLICK';

export function createValueClickAction(
  getStartServices: () => { uiActions: UiActionsStart }
): ActionByType<typeof ACTION_VALUE_CLICK> {
  return createAction<typeof ACTION_VALUE_CLICK>({
    type: ACTION_VALUE_CLICK,
    id: ACTION_VALUE_CLICK,
    shouldAutoExecute: async () => true,
    execute: async (context: ValueClickActionContext) => {
      try {
        const filters: Filter[] = await createFiltersFromValueClickAction(context.data);
        if (filters.length > 0) {
          await getStartServices().uiActions.getTrigger(APPLY_FILTER_TRIGGER).exec({
            filters,
            embeddable: context.embeddable,
            timeFieldName: context.data.timeFieldName,
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          `Error [ACTION_EMIT_APPLY_FILTER_TRIGGER]: can\'t extract filters from action context`
        );
      }
    },
  });
}
