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
import { toMountPoint } from '../../../../plugins/kibana_react/public';
import {
  ActionByType,
  createAction,
  IncompatibleActionError,
} from '../../../../plugins/ui_actions/public';
import { getOverlays, getIndexPatterns } from '../services';
import { applyFiltersPopover } from '../ui/apply_filters';
import { createFiltersFromValueClickAction } from './filters/create_filters_from_value_click';
import { ValueClickContext } from '../../../embeddable/public';
import { Filter, FilterManager, TimefilterContract, esFilters } from '..';

export const ACTION_VALUE_CLICK = 'ACTION_VALUE_CLICK';

export type ValueClickActionContext = ValueClickContext;

async function isCompatible(context: ValueClickActionContext) {
  try {
    const filters: Filter[] = await createFiltersFromValueClickAction(context.data);
    return filters.length > 0;
  } catch {
    return false;
  }
}

export function valueClickAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract
): ActionByType<typeof ACTION_VALUE_CLICK> {
  return createAction<typeof ACTION_VALUE_CLICK>({
    type: ACTION_VALUE_CLICK,
    id: ACTION_VALUE_CLICK,
    getIconType: () => 'filter',
    getDisplayName: () => {
      return i18n.translate('data.filter.applyFilterActionTitle', {
        defaultMessage: 'Apply filter to current view',
      });
    },
    isCompatible,
    execute: async ({ data }: ValueClickActionContext) => {
      if (!(await isCompatible({ data }))) {
        throw new IncompatibleActionError();
      }

      const filters: Filter[] = await createFiltersFromValueClickAction(data);

      let selectedFilters = filters;

      if (filters.length > 1) {
        const indexPatterns = await Promise.all(
          filters.map((filter) => {
            return getIndexPatterns().get(filter.meta.index!);
          })
        );

        const filterSelectionPromise: Promise<Filter[]> = new Promise((resolve) => {
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

        selectedFilters = await filterSelectionPromise;
      }

      if (data.timeFieldName) {
        const { timeRangeFilter, restOfFilters } = esFilters.extractTimeFilter(
          data.timeFieldName,
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
