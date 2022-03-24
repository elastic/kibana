/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ThemeServiceSetup } from 'kibana/public';
import { toMountPoint } from '../../../kibana_react/public';
import { Action, createAction, IncompatibleActionError } from '../../../ui_actions/public';
import { getOverlays, getIndexPatterns } from '../services';
import { applyFiltersPopover } from '../apply_filters';
import {
  Filter,
  FilterManager,
  TimefilterContract,
  esFilters,
  ACTION_GLOBAL_APPLY_FILTER,
} from '../../../data/public';
import type { ApplyGlobalFilterActionContext } from '../../../data/public';

async function isCompatible(context: ApplyGlobalFilterActionContext) {
  return context.filters !== undefined;
}

export function createFilterAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract,
  theme: ThemeServiceSetup
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
    execute: async ({ filters, timeFieldName, controlledBy }: ApplyGlobalFilterActionContext) => {
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
              ),
              { theme$: theme.theme$ }
            ),
            {
              'data-test-subj': 'test',
            }
          );
        });

        selectedFilters = await filterSelectionPromise;
      }

      // remove existing filters for control prior to adding new filtes for control
      if (controlledBy) {
        filterManager.getFilters().forEach((filter) => {
          if (filter.meta.controlledBy === controlledBy) {
            filterManager.removeFilter(filter);
          }
        });
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
