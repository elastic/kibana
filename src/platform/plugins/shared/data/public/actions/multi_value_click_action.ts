/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Datatable } from '@kbn/expressions-plugin/public';
import { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { BooleanRelation, extractTimeFilter, convertRangeFilterToTimeRange } from '@kbn/es-query';
import { QueryStart } from '../query';
import { createFiltersFromMultiValueClickAction } from './filters/create_filters_from_multi_value_click';

export type MultiValueClickActionContext = MultiValueClickContext;
export const ACTION_MULTI_VALUE_CLICK = 'ACTION_MULTI_VALUE_CLICK';

export interface MultiValueClickContext {
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
  data: {
    data: Array<{
      cells: Array<{
        column: number;
        row: number;
      }>;
      table: Pick<Datatable, 'rows' | 'columns' | 'meta'>;
      relation?: BooleanRelation;
    }>;
    timeFieldName?: string;
    negate?: boolean;
  };
}

export function createMultiValueClickActionDefinition(
  getStartServices: () => { query: QueryStart }
): UiActionsActionDefinition<MultiValueClickContext> {
  return {
    type: ACTION_MULTI_VALUE_CLICK,
    id: ACTION_MULTI_VALUE_CLICK,
    shouldAutoExecute: async () => true,
    isCompatible: async (context: MultiValueClickContext) => {
      const filters = await createFiltersFromMultiValueClickAction(context.data);
      return Boolean(filters);
    },
    execute: async ({ data }: MultiValueClickActionContext) => {
      const filters = await createFiltersFromMultiValueClickAction(data);
      if (!filters || filters?.length === 0) return;
      const {
        filterManager,
        timefilter: { timefilter },
      } = getStartServices().query;

      if (data.timeFieldName) {
        const { timeRangeFilter, restOfFilters } = extractTimeFilter(data.timeFieldName, filters);
        filterManager.addFilters(restOfFilters);
        if (timeRangeFilter) {
          timefilter.setTime(convertRangeFilterToTimeRange(timeRangeFilter));
        }
      } else {
        filterManager.addFilters(filters);
      }
    },
  };
}
