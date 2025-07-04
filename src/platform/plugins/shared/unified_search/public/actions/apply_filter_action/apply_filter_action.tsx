/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { IncompatibleActionError, UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { FilterManager, TimefilterContract } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import { convertRangeFilterToTimeRange, extractTimeFilter } from '@kbn/es-query';
import { getIndexPatterns } from '../../services';
import { ApplyFiltersPopoverContent } from './apply_filter_popover_content';
import { ACTION_GLOBAL_APPLY_FILTER } from '../constants';

export interface ApplyGlobalFilterActionContext {
  filters: Filter[];
  timeFieldName?: string;
  embeddable?: unknown;
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
  coreStart: CoreStart,
  id: string = ACTION_GLOBAL_APPLY_FILTER,
  type: string = ACTION_GLOBAL_APPLY_FILTER
): UiActionsActionDefinition<ApplyGlobalFilterActionContext> {
  return {
    type,
    id,
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
          const overlay = coreStart.overlays.openModal(
            toMountPoint(
              <ApplyFiltersPopoverContent
                indexPatterns={indexPatterns}
                filters={filters}
                onCancel={() => {
                  overlay.close();
                  resolve([]);
                }}
                onSubmit={(filterSelection: Filter[]) => {
                  overlay.close();
                  resolve(filterSelection);
                }}
              />,
              coreStart
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
        const { timeRangeFilter, restOfFilters } = extractTimeFilter(
          timeFieldName,
          selectedFilters
        );
        filterManager.addFilters(restOfFilters);
        if (timeRangeFilter) {
          timeFilter.setTime(convertRangeFilterToTimeRange(timeRangeFilter));
        }
      } else {
        filterManager.addFilters(selectedFilters);
      }
    },
  };
}
