/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';
import { Datatable } from '@kbn/expressions-plugin/public';
import { UiActionsActionDefinition, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { APPLY_FILTER_TRIGGER } from '../triggers';
import { createFiltersFromValueClickAction } from './filters/create_filters_from_value_click';

export type ValueClickActionContext = ValueClickContext;
export const ACTION_VALUE_CLICK = 'ACTION_VALUE_CLICK';

export interface ValueClickContext {
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
  data: {
    data: Array<{
      table: Pick<Datatable, 'rows' | 'columns'>;
      column: number;
      row: number;
      value: any;
    }>;
    timeFieldName?: string;
    negate?: boolean;
  };
}

export function createValueClickActionDefinition(
  getStartServices: () => { uiActions: UiActionsStart }
): UiActionsActionDefinition<ValueClickContext> {
  return {
    type: ACTION_VALUE_CLICK,
    id: ACTION_VALUE_CLICK,
    shouldAutoExecute: async () => true,
    isCompatible: async (context: ValueClickContext) => {
      const filters = await createFiltersFromValueClickAction(context.data);
      return filters.length > 0;
    },
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
  };
}
