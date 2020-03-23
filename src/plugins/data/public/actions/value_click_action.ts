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
import { RangeFilter } from 'src/plugins/data/public';
import { toMountPoint } from '../../../../plugins/kibana_react/public';
import {
  ActionByType,
  createAction,
  IncompatibleActionError,
} from '../../../../plugins/ui_actions/public';
import { getOverlays, getIndexPatterns } from '../services';
import { applyFiltersPopover } from '../ui/apply_filters';
import { createFiltersFromEvent } from './filters/create_filters_from_event';
import { Filter, FilterManager, TimefilterContract, esFilters } from '..';

export const ACTION_VALUE_CLICK = 'ACTION_VALUE_CLICK';

export interface ValueClickActionContext {
  data: any;
  timeFieldName: string;
}

async function isCompatible(context: ValueClickActionContext) {
  try {
    const filters: Filter[] =
      (await createFiltersFromEvent(context.data.data || [context.data], context.data.negate)) ||
      [];
    return filters.length > 0;
  } catch {
    return false;
  }
}

// this allows the user to select which filter to use
const filterSelectionFn = (filters: Filter[]): Promise<Filter[]> =>
  new Promise(async resolve => {
    const indexPatterns = await Promise.all(
      filters.map(filter => {
        return getIndexPatterns().get(filter.meta.index!);
      })
    );

    const overlay = getOverlays().openModal(
      toMountPoint(
        applyFiltersPopover(
          filters,
          indexPatterns,
          () => {
            overlay.close();
            resolve([]);
          },
          (filterSelection: Filter[]) => {
            overlay.close();
            resolve(filterSelection);
          }
        )
      ),
      {
        'data-test-subj': 'selectFilterOverlay',
      }
    );
  });

// given a ValueClickActionContext, returns timeRangeFilter and Filters
export const valueClickActionGetFilters = async (
  { timeFieldName, data }: ValueClickActionContext,
  filterSelection: (filters: Filter[]) => Promise<Filter[]> = async (filters: Filter[]) => filters
): Promise<{
  timeRangeFilter?: RangeFilter;
  restOfFilters: Filter[];
}> => {
  if (!(await isCompatible({ timeFieldName, data }))) {
    throw new IncompatibleActionError();
  }

  const filters: Filter[] = (await createFiltersFromEvent(data.data || [data], data.negate)) || [];

  let selectedFilters: Filter[] = esFilters.mapAndFlattenFilters(filters);

  if (selectedFilters.length > 1) {
    selectedFilters = await filterSelection(filters);
  }

  return esFilters.extractTimeFilter(timeFieldName || '', selectedFilters);
};

// gets and applies the filters
export const valueClickActionExecute = (
  filterManager: FilterManager,
  timeFilter: TimefilterContract,
  filterSelection: (filters: Filter[]) => Promise<Filter[]> = async (filters: Filter[]) => filters
) => async ({ timeFieldName, data }: ValueClickActionContext) => {
  const { timeRangeFilter, restOfFilters } = await valueClickActionGetFilters(
    {
      timeFieldName,
      data,
    },
    filterSelection
  );

  filterManager.addFilters(restOfFilters);
  if (timeRangeFilter) {
    esFilters.changeTimeFilter(timeFilter, timeRangeFilter);
  }
};

export function valueClickAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract
): ActionByType<typeof ACTION_VALUE_CLICK> {
  return createAction<typeof ACTION_VALUE_CLICK>({
    type: ACTION_VALUE_CLICK,
    id: ACTION_VALUE_CLICK,
    getDisplayName: () => {
      return i18n.translate('data.filter.applyFilterActionTitle', {
        defaultMessage: 'Apply filter to current view',
      });
    },
    isCompatible,
    execute: valueClickActionExecute(filterManager, timeFilter, filterSelectionFn),
  });
}
