/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useQuery } from '@kbn/react-query';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useWorkflowsApi, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import {
  WORKFLOW_EXECUTIONS_DATA_VIEW_ID,
  WORKFLOW_EXECUTIONS_DATA_VIEW_SPEC,
} from './workflow_executions_data_view';
import {
  DEFAULT_EXECUTION_PAGE_FILTERS,
  EXECUTION_FILTERS_STORAGE_KEY,
} from './workflow_executions_page_constants';
import {
  buildExcludeManagedExecutionsFilter,
  buildExcludeStepRunsFilter,
  buildReadableWorkflowsFilter,
} from './workflow_executions_scope_filters';
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
    const api = useWorkflowsApi();
    const { canReadManagedWorkflowExecution } = useWorkflowsCapabilities();

    // The options lists read the execution data as the current user, which ignores workflow access
    // control, so they are scoped to the workflows the user can read until that data enforces it.
    const {
      data: readableWorkflows,
      isError,
      refetch,
    } = useQuery({
      networkMode: 'always',
      queryKey: ['workflows', 'executions', 'readableWorkflowIds', spaceId],
      queryFn: () => api.getReadableWorkflowIds(),
      enabled: Boolean(spaceId),
      retry: false,
    });
    const readableWorkflowIds = readableWorkflows?.workflowIds;

    const parentFilters = useMemo(
      () => [
        buildExcludeStepRunsFilter(),
        ...(canReadManagedWorkflowExecution ? [] : [buildExcludeManagedExecutionsFilter()]),
        ...(readableWorkflowIds ? [buildReadableWorkflowsFilter(readableWorkflowIds)] : []),
      ],
      [canReadManagedWorkflowExecution, readableWorkflowIds]
    );

    const handleRetry = useCallback(() => {
      void refetch();
    }, [refetch]);

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

    // Without the scope the options are never fetched, so a failure must be surfaced, not hidden.
    if (isError && !readableWorkflows) {
      return (
        <KbnWarningCallout
          announceOnMount
          data-test-subj="workflowExecutionsFiltersError"
          title={i18n.translate('workflows.executionsPage.filters.scopeError.title', {
            defaultMessage: 'Filters are unavailable',
          })}
          text={i18n.translate('workflows.executionsPage.filters.scopeError.description', {
            defaultMessage: 'The workflows you can access could not be loaded.',
          })}
          actionProps={{
            primary: {
              children: i18n.translate('workflows.executionsPage.filters.scopeError.retry', {
                defaultMessage: 'Retry',
              }),
              onClick: handleRetry,
              'data-test-subj': 'workflowExecutionsFiltersRetry',
            },
          }}
        />
      );
    }

    // Wait for the scope so the options are never fetched unscoped, not even once.
    if (!readableWorkflows) {
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
          parentFilters={parentFilters}
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
