/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Datatable } from 'src/plugins/expressions/public';
import { Action, createAction, UiActionsStart } from '../../../../plugins/ui_actions/public';
import { APPLY_FILTER_TRIGGER } from '../triggers';
import { createFiltersFromValueClickAction } from './filters/create_filters_from_value_click';
import type { Filter } from '../../common/es_query/filters';

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

export function createValueClickAction(
  getStartServices: () => { uiActions: UiActionsStart }
): Action {
  return createAction({
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
