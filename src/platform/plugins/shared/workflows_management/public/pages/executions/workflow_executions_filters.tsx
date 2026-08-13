/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  WORKFLOW_EXECUTIONS_DATA_VIEW_ID,
  WORKFLOW_EXECUTIONS_DATA_VIEW_SPEC,
} from './workflow_executions_data_view';
import {
  DEFAULT_EXECUTION_PAGE_FILTERS,
  EXECUTION_FILTERS_STORAGE_KEY,
} from './workflow_executions_page_constants';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';
import {
  type FilterControlConfig,
  FilterControls,
  type FilterGroupHandler,
} from '../../shared/ui/filter_controls';

export interface WorkflowExecutionsFiltersProps {
  controlsUrlState?: FilterControlConfig[];
  filters: Filter[];
  onFilterGroupInit?: (handler: FilterGroupHandler | undefined) => void;
  query?: Query;
  setControlsUrlState: (controls: FilterControlConfig[]) => void;
  timeRange: TimeRange;
  onFiltersChange: (filters: Filter[]) => void;
}

export const WorkflowExecutionsFilters = React.memo<WorkflowExecutionsFiltersProps>(
  ({
    controlsUrlState,
    filters,
    onFilterGroupInit,
    onFiltersChange,
    query,
    setControlsUrlState,
    timeRange,
  }) => {
    const { dataViews } = useKibana().services;
    const spaceId = useSpaceId();

    const dataViewSpec = useMemo(
      () => ({
        ...WORKFLOW_EXECUTIONS_DATA_VIEW_SPEC,
        id: WORKFLOW_EXECUTIONS_DATA_VIEW_ID,
      }),
      []
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
          onInit={onFilterGroupInit}
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
