/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { createKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import {
  WORKFLOW_EXECUTIONS_DATA_VIEW_ID,
  WORKFLOW_EXECUTIONS_DATA_VIEW_SPEC,
} from './workflow_executions_data_view';
import {
  DEFAULT_EXECUTION_PAGE_FILTERS,
  EXECUTION_FILTERS_STORAGE_KEY,
  EXECUTION_FILTERS_URL_PARAM_KEY,
} from './workflow_executions_page_constants';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';
import { type FilterControlConfig, FilterControls } from '../../shared/ui/filter_controls';

export interface WorkflowExecutionsFiltersProps {
  filters: Filter[];
  query?: Query;
  timeRange: TimeRange;
  onFiltersChange: (filters: Filter[]) => void;
}

export const WorkflowExecutionsFilters = React.memo<WorkflowExecutionsFiltersProps>(
  ({ filters, query, timeRange, onFiltersChange }) => {
    const { dataViews } = useKibana().services;
    const spaceId = useSpaceId();
    const history = useHistory();

    const urlStorage = useMemo(
      () =>
        createKbnUrlStateStorage({
          history,
          useHash: false,
          useHashQuery: false,
        }),
      [history]
    );

    // Read from the URL only when the storage instance changes (effectively once). The control group
    // owns the filter state afterwards and syncs it back to the URL via `setControlsUrlState`.
    // Re-reading on every render (or remounting on URL change) causes the control group to blink on
    // each edit.
    const controlsUrlState = useMemo(() => {
      const persisted = urlStorage.get<FilterControlConfig[] | undefined>(
        EXECUTION_FILTERS_URL_PARAM_KEY
      );
      return persisted ? persisted.map(convertCamelCasedKeysToSnakeCase) : undefined;
    }, [urlStorage]);

    const dataViewSpec = useMemo(
      () => ({
        ...WORKFLOW_EXECUTIONS_DATA_VIEW_SPEC,
        id: WORKFLOW_EXECUTIONS_DATA_VIEW_ID,
      }),
      []
    );

    const setControlsUrlState = useCallback(
      (next: FilterControlConfig[]) => {
        urlStorage.set(EXECUTION_FILTERS_URL_PARAM_KEY, next);
      },
      [urlStorage]
    );

    const services = useMemo(
      () => ({
        dataViews,
        storage: Storage,
      }),
      [dataViews]
    );

    if (!spaceId) {
      return null;
    }

    return (
      <div data-test-subj="workflowExecutionsFilters">
        <FilterControls
          controlsUrlState={controlsUrlState}
          dataViewSpec={dataViewSpec}
          defaultControls={DEFAULT_EXECUTION_PAGE_FILTERS}
          filters={filters}
          maxControls={4}
          onFiltersChange={onFiltersChange}
          query={query}
          services={services}
          setControlsUrlState={setControlsUrlState}
          spaceId={spaceId}
          storageKey={EXECUTION_FILTERS_STORAGE_KEY}
          timeRange={timeRange}
        />
      </div>
    );
  }
);
WorkflowExecutionsFilters.displayName = 'WorkflowExecutionsFilters';
