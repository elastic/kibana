/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';
import { Datatable } from '@kbn/expressions-plugin/public';
import { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { FilterManager } from '../query';
import { createFiltersFromMultiValueClickAction } from './filters/create_filters_from_multi_value_click';

export type MultiValueClickActionContext = MultiValueClickContext;
export const ACTION_MULTI_VALUE_CLICK = 'ACTION_MULTI_VALUE_CLICK';

export interface MultiValueClickContext {
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
  data: {
    data: {
      table: Pick<Datatable, 'rows' | 'columns' | 'meta'>;
      column: number;
      value: any[];
    };
    timeFieldName?: string;
    negate?: boolean;
  };
}

export function createMultiValueClickActionDefinition(
  getStartServices: () => { filterManager: FilterManager }
): UiActionsActionDefinition<MultiValueClickContext> {
  return {
    type: ACTION_MULTI_VALUE_CLICK,
    id: ACTION_MULTI_VALUE_CLICK,
    shouldAutoExecute: async () => true,
    isCompatible: async (context: MultiValueClickContext) => {
      const filters = await createFiltersFromMultiValueClickAction(context.data);
      return Boolean(filters);
    },
    execute: async (context: MultiValueClickActionContext) => {
      const filter = (await createFiltersFromMultiValueClickAction(context.data)) as Filter;
      getStartServices().filterManager.addFilters(filter);
    },
  };
}
