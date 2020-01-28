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
  IAction,
  createAction,
  IncompatibleActionError,
} from '../../../../../plugins/ui_actions/public';
// @ts-ignore
import { onBrushEvent } from './filters/brush_event';
import {
  esFilters,
  FilterManager,
  TimefilterContract,
  changeTimeFilter,
  extractTimeFilter,
  mapAndFlattenFilters,
} from '../../../../../plugins/data/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getIndexPatterns } from '../../../../../plugins/data/public/services';

export const SELECT_RANGE_ACTION = 'SELECT_RANGE_ACTION';

interface ActionContext {
  data: any;
  timeFieldName: string;
}

async function isCompatible(context: ActionContext) {
  try {
    const filters: esFilters.Filter[] = (await onBrushEvent(context.data, getIndexPatterns)) || [];
    return filters.length > 0;
  } catch {
    return false;
  }
}

export function selectRangeAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract
): IAction<ActionContext> {
  return createAction<ActionContext>({
    type: SELECT_RANGE_ACTION,
    id: SELECT_RANGE_ACTION,
    getDisplayName: () => {
      return i18n.translate('data.filter.applyFilterActionTitle', {
        defaultMessage: 'Apply filter to current view',
      });
    },
    isCompatible,
    execute: async ({ timeFieldName, data }: ActionContext) => {
      if (!(await isCompatible({ timeFieldName, data }))) {
        throw new IncompatibleActionError();
      }

      const filters: esFilters.Filter[] = (await onBrushEvent(data, getIndexPatterns)) || [];

      const selectedFilters: esFilters.Filter[] = mapAndFlattenFilters(filters);

      if (timeFieldName) {
        const { timeRangeFilter, restOfFilters } = extractTimeFilter(
          timeFieldName,
          selectedFilters
        );
        filterManager.addFilters(restOfFilters);
        if (timeRangeFilter) {
          changeTimeFilter(timeFilter, timeRangeFilter);
        }
      } else {
        filterManager.addFilters(selectedFilters);
      }
    },
  });
}
