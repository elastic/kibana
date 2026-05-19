/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';
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

export interface WorkflowExecutionsFiltersProps {
  filters: Filter[];
  query?: Query;
  timeRange: TimeRange;
  onFiltersChange: (filters: Filter[]) => void;
}

export const WorkflowExecutionsFilters = React.memo<WorkflowExecutionsFiltersProps>(
  ({ filters, query, timeRange, onFiltersChange }) => {
    const { http, notifications, dataViews } = useKibana().services;
    const spaceId = useSpaceId();
    const history = useHistory();
    const location = useLocation();

    const urlStorage = useMemo(
      () =>
        createKbnUrlStateStorage({
          history,
          useHash: false,
          useHashQuery: false,
        }),
      [history]
    );

    const persisted = urlStorage.get<FilterControlConfig[] | undefined>(
      EXECUTION_FILTERS_URL_PARAM_KEY
    );
    const controlsUrlState = persisted
      ? persisted.map(convertCamelCasedKeysToSnakeCase)
      : undefined;

    const setControlsUrlState = useCallback(
      (next: FilterControlConfig[]) => {
        urlStorage.set(EXECUTION_FILTERS_URL_PARAM_KEY, next);
      },
      [urlStorage]
    );

    const services = useMemo(
      () => ({
        http,
        notifications,
        dataViews,
        storage: Storage,
      }),
      [http, notifications, dataViews]
    );

    if (!spaceId) {
      return null;
    }

    return (
      <div data-test-subj="workflowExecutionsFilters" key={location.search}>
        <AlertFilterControls
          controlsUrlState={controlsUrlState}
          dataViewSpec={{
            ...WORKFLOW_EXECUTIONS_DATA_VIEW_SPEC,
            id: WORKFLOW_EXECUTIONS_DATA_VIEW_ID,
          }}
          defaultControls={DEFAULT_EXECUTION_PAGE_FILTERS}
          filters={filters}
          maxControls={4}
          onFiltersChange={onFiltersChange}
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
