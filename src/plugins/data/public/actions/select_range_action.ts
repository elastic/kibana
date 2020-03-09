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

import { i18n } from '@kbn/i18n';
import {
  createAction,
  IncompatibleActionError,
  ActionByType,
} from '../../../../plugins/ui_actions/public';
import { onBrushEvent } from './filters/brush_event';
import { FilterManager, TimefilterContract, esFilters } from '..';

export const ACTION_SELECT_RANGE = 'ACTION_SELECT_RANGE';

export interface SelectRangeActionContext {
  data: any;
  timeFieldName: string;
}

async function isCompatible(context: SelectRangeActionContext) {
  try {
    return Boolean(await onBrushEvent(context.data));
  } catch {
    return false;
  }
}

export function selectRangeAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract
): ActionByType<typeof ACTION_SELECT_RANGE> {
  return createAction<typeof ACTION_SELECT_RANGE>({
    type: ACTION_SELECT_RANGE,
    id: ACTION_SELECT_RANGE,
    getDisplayName: () => {
      return i18n.translate('data.filter.applyFilterActionTitle', {
        defaultMessage: 'Apply filter to current view',
      });
    },
    isCompatible,
    execute: async ({ timeFieldName, data }: SelectRangeActionContext) => {
      if (!(await isCompatible({ timeFieldName, data }))) {
        throw new IncompatibleActionError();
      }

      const filter = await onBrushEvent(data);

      if (!filter) {
        return;
      }

      const selectedFilters = esFilters.mapAndFlattenFilters([filter]);

      if (timeFieldName) {
        const { timeRangeFilter, restOfFilters } = esFilters.extractTimeFilter(
          timeFieldName,
          selectedFilters
        );
        filterManager.addFilters(restOfFilters);
        if (timeRangeFilter) {
          esFilters.changeTimeFilter(timeFilter, timeRangeFilter);
        }
      } else {
        filterManager.addFilters(selectedFilters);
      }
    },
  });
}
