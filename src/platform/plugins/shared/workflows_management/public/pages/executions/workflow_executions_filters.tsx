/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { WORKFLOW_EXECUTIONS_DATA_VIEW_CREATE_SPEC } from './workflow_executions_data_view';
import {
  DEFAULT_EXECUTION_PAGE_FILTERS,
  EXECUTION_FILTERS_STORAGE_KEY,
} from './workflow_executions_page_constants';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';

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
    const { http, notifications, dataViews } = useKibana().services;
    const spaceId = useSpaceId();

    const scopedDataViews = useMemo(
      () => ({
        ...dataViews,
        create: (
          spec: Parameters<typeof dataViews.create>[0],
          _skipFetchFields?: boolean,
          displayErrors?: boolean
        ) => dataViews.create(spec, true, displayErrors),
      }),
      [dataViews]
    );

    const services = useMemo(
      () => ({
        http,
        notifications,
        dataViews: scopedDataViews,
        storage: Storage,
      }),
      [http, notifications, scopedDataViews]
    );

    if (!spaceId) {
      return null;
    }

    return (
      <div data-test-subj="workflowExecutionsFilters">
        <AlertFilterControls
          controlsUrlState={controlsUrlState}
          dataViewSpec={WORKFLOW_EXECUTIONS_DATA_VIEW_CREATE_SPEC}
          defaultControls={DEFAULT_EXECUTION_PAGE_FILTERS}
          filters={filters}
          maxControls={4}
          onFiltersChange={onFiltersChange}
          onInit={onFilterGroupInit}
          query={query}
          ruleTypeIds={[]}
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
