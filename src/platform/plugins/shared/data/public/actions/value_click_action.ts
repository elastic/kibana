/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, AggregateQuery } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { UiActionsActionDefinition, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';

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
    query?: AggregateQuery;
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
      const { createFiltersFromValueClickAction, appendFilterToESQLQueryFromValueClickAction } =
        await import('./filters');
      if (context.data.query && isOfAggregateQueryType(context.data.query)) {
        const queryString = await appendFilterToESQLQueryFromValueClickAction(context.data);
        return queryString != null;
      }
      const filters = await createFiltersFromValueClickAction(context.data);
      return filters.length > 0;
    },
    execute: async (context: ValueClickActionContext) => {
      try {
        if (context.data.query && isOfAggregateQueryType(context.data.query)) {
          // ES|QL charts have a different way of applying filters,
          // they are appending a where clause to the query

          const { appendFilterToESQLQueryFromValueClickAction } = await import('./filters');
          const queryString = appendFilterToESQLQueryFromValueClickAction(context.data);
          await getStartServices().uiActions.executeTriggerActions('UPDATE_ESQL_QUERY_TRIGGER', {
            queryString,
          });
        } else {
          const { createFiltersFromValueClickAction } = await import('./filters');
          const filters: Filter[] = await createFiltersFromValueClickAction(context.data);
          if (filters.length > 0) {
            await getStartServices().uiActions.executeTriggerActions(APPLY_FILTER_TRIGGER, {
              filters,
              embeddable: context.embeddable,
              timeFieldName: context.data.timeFieldName,
            });
          }
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
