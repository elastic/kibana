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
import { toMountPoint } from '../../../../../plugins/kibana_react/public';
import {
  Action,
  createAction,
  IncompatibleActionError,
} from '../../../../../plugins/ui_actions/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getOverlays, getIndexPatterns } from '../../../../../plugins/data/public/services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { applyFiltersPopover } from '../../../../../plugins/data/public/ui/apply_filters';
// @ts-ignore
import { createFiltersFromEvent } from './filters/create_filters_from_event';
import {
  Filter,
  FilterManager,
  TimefilterContract,
  esFilters,
} from '../../../../../plugins/data/public';

export const VALUE_CLICK_ACTION = 'VALUE_CLICK_ACTION';

interface ActionContext {
  data: any;
  timeFieldName: string;
}

async function isCompatible(context: ActionContext) {
  try {
    const filters: Filter[] = (await createFiltersFromEvent(context.data)) || [];
    return filters.length > 0;
  } catch {
    return false;
  }
}

export function valueClickAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract
): Action<ActionContext> {
  return createAction<ActionContext>({
    type: VALUE_CLICK_ACTION,
    id: VALUE_CLICK_ACTION,
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

      const filters: Filter[] = (await createFiltersFromEvent(data)) || [];

      let selectedFilters: Filter[] = esFilters.mapAndFlattenFilters(filters);

      if (selectedFilters.length > 1) {
        const indexPatterns = await Promise.all(
          filters.map(filter => {
            return getIndexPatterns().get(filter.meta.index!);
          })
        );

        const filterSelectionPromise: Promise<Filter[]> = new Promise(resolve => {
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
