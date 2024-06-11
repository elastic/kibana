/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, AggregateQuery, isOfAggregateQueryType } from '@kbn/es-query';
import { Datatable } from '@kbn/expressions-plugin/public';
import { UiActionsActionDefinition, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { APPLY_FILTER_TRIGGER } from '../triggers';
import {
  createFiltersFromValueClickAction,
  appendFilterToESQLQueryFromValueClickAction,
} from './filters/create_filters_from_value_click';

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
          const queryString = appendFilterToESQLQueryFromValueClickAction(context.data);
          await getStartServices().uiActions.getTrigger('UPDATE_ESQL_QUERY_TRIGGER').exec({
            queryString,
          });
        } else {
          const filters: Filter[] = await createFiltersFromValueClickAction(context.data);
          if (filters.length > 0) {
            await getStartServices().uiActions.getTrigger(APPLY_FILTER_TRIGGER).exec({
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
