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
