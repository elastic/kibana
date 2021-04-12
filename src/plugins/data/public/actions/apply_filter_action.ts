/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../kibana_react/public';
import { Action, createAction, IncompatibleActionError } from '../../../ui_actions/public';
import { getOverlays, getIndexPatterns } from '../services';
import { applyFiltersPopover } from '../ui/apply_filters';
import { Filter, FilterManager, TimefilterContract, esFilters } from '..';

export const ACTION_GLOBAL_APPLY_FILTER = 'ACTION_GLOBAL_APPLY_FILTER';

export interface ApplyGlobalFilterActionContext {
  filters: Filter[];
  timeFieldName?: string;
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
}

async function isCompatible(context: ApplyGlobalFilterActionContext) {
  return context.filters !== undefined;
}

export function createFilterAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract
): Action {
  return createAction({
    type: ACTION_GLOBAL_APPLY_FILTER,
    id: ACTION_GLOBAL_APPLY_FILTER,
    order: 100,
    getIconType: () => 'filter',
    getDisplayName: () => {
      return i18n.translate('data.filter.applyFilterActionTitle', {
        defaultMessage: 'Apply filter to current view',
      });
    },
    isCompatible,
    execute: async ({ filters, timeFieldName }: ApplyGlobalFilterActionContext) => {
      if (!filters) {
        throw new Error('Applying a filter requires a filter');
      }

      if (!(await isCompatible({ filters }))) {
        throw new IncompatibleActionError();
      }

      let selectedFilters: Filter[] = filters;

      if (selectedFilters.length > 1) {
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
              'data-test-subj': 'test',
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
