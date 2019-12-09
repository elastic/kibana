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
import { toMountPoint } from '../../../kibana_react/public';
import { IAction, createAction, IncompatibleActionError } from '../../../ui_actions/public';
import { getOverlays, getIndexPatterns } from '../services';
import { applyFiltersPopover } from '../ui/apply_filters';
import {
  esFilters,
  FilterManager,
  TimefilterContract,
  changeTimeFilter,
  extractTimeFilter,
} from '..';

export const GLOBAL_APPLY_FILTER_ACTION = 'GLOBAL_APPLY_FILTER_ACTION';

interface ActionContext {
  filters: esFilters.Filter[];
  timeFieldName?: string;
}

async function isCompatible(context: ActionContext) {
  return context.filters !== undefined;
}

export function createFilterAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract
): IAction<ActionContext> {
  return createAction<ActionContext>({
    type: GLOBAL_APPLY_FILTER_ACTION,
    id: GLOBAL_APPLY_FILTER_ACTION,
    getDisplayName: () => {
      return i18n.translate('data.filter.applyFilterActionTitle', {
        defaultMessage: 'Apply filter to current view',
      });
    },
    isCompatible,
    execute: async ({ filters, timeFieldName }: ActionContext) => {
      if (!filters) {
        throw new Error('Applying a filter requires a filter');
      }

      if (!(await isCompatible({ filters }))) {
        throw new IncompatibleActionError();
      }

      let selectedFilters: esFilters.Filter[] = filters;

      if (selectedFilters.length > 1) {
        const indexPatterns = await Promise.all(
          filters.map(filter => {
            return getIndexPatterns().get(filter.meta.index!);
          })
        );

        const filterSelectionPromise: Promise<esFilters.Filter[]> = new Promise(resolve => {
          const overlay = getOverlays().openModal(
            toMountPoint(
              applyFiltersPopover(
                filters,
                indexPatterns,
                () => {
                  overlay.close();
                  resolve([]);
                },
                (filterSelection: esFilters.Filter[]) => {
                  overlay.close();
                  resolve(filterSelection);
                }
              )
            ),
            {
              'data-test-subj': 'test',
            }
          );
        });

        selectedFilters = await filterSelectionPromise;
      }

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
