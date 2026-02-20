/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { UiActionsActionDefinition, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';

export interface SelectRangeActionContext {
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
  data: {
    table: Datatable;
    column: number;
    range: number[];
    timeFieldName?: string;
    query?: AggregateQuery;
  };
}

export const ACTION_SELECT_RANGE = 'ACTION_SELECT_RANGE';

export function createSelectRangeActionDefinition(
  getStartServices: () => { uiActions: UiActionsStart }
): UiActionsActionDefinition<SelectRangeActionContext> {
  return {
    type: ACTION_SELECT_RANGE,
    id: ACTION_SELECT_RANGE,
    shouldAutoExecute: async () => true,
    execute: async (context: SelectRangeActionContext) => {
      try {
        const { createFiltersFromRangeSelectAction } = await import('./filters');
        const filters = await createFiltersFromRangeSelectAction(context.data);
        if (filters.length > 0) {
          await getStartServices().uiActions.executeTriggerActions(APPLY_FILTER_TRIGGER, {
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
  };
}
