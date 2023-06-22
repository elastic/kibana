/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ThemeServiceSetup } from '@kbn/core/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { IncompatibleActionError, UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
// for cleanup esFilters need to fix the issue https://github.com/elastic/kibana/issues/131292
import { FilterManager, TimefilterContract } from '@kbn/data-plugin/public';
import type { Filter, RangeFilter } from '@kbn/es-query';
import { getOverlays, getIndexPatterns } from '../services';
import { applyFiltersPopover } from '../apply_filters';

export const ACTION_GLOBAL_APPLY_FILTER = 'ACTION_GLOBAL_APPLY_FILTER';

export interface ApplyGlobalFilterActionContext {
  filters: Filter[];
  timeFieldName?: string;
  embeddable?: IEmbeddable;
  // controlledBy is an optional key in filter.meta that identifies the owner of a filter
  // Pass controlledBy to cleanup an existing filter(s) owned by embeddable prior to adding new filters
  controlledBy?: string;
}

async function isCompatible(context: ApplyGlobalFilterActionContext) {
  return context.filters !== undefined;
}

export function createFilterAction(
  filterManager: FilterManager,
  timeFilter: TimefilterContract,
  theme: ThemeServiceSetup
): UiActionsActionDefinition<ApplyGlobalFilterActionContext> {
  return {
    type: ACTION_GLOBAL_APPLY_FILTER,
    id: ACTION_GLOBAL_APPLY_FILTER,
    order: 100,
    getIconType: () => 'filter',
    getDisplayName: () => {
      return i18n.translate('unifiedSearch.filter.applyFilterActionTitle', {
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
        const { extractTimeFilter } = await import('@kbn/es-query');
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
  };
}

async function changeTimeFilter(timeFilter: TimefilterContract, filter: RangeFilter) {
  const { convertRangeFilterToTimeRange } = await import('@kbn/es-query');
  timeFilter.setTime(convertRangeFilterToTimeRange(filter));
}
