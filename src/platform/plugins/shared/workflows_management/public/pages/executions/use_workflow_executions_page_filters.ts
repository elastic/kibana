/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import {
  setWorkflowIdOnControlConfigs,
  updateWorkflowIdSelectedOptions,
} from './workflow_executions_filter_utils';
import {
  DEFAULT_EXECUTION_PAGE_FILTERS,
  EXECUTION_FILTERS_URL_PARAM_KEY,
} from './workflow_executions_page_constants';

export const useWorkflowExecutionsPageFilters = () => {
  const history = useHistory();
  const filterGroupHandlerRef = useRef<FilterGroupHandler>();
  const pendingWorkflowIdRef = useRef<string | null>(null);

  const urlStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: false,
        useHashQuery: false,
      }),
    [history]
  );

  const controlsUrlState = useMemo(() => {
    const persisted = urlStorage.get<FilterControlConfig[] | undefined>(
      EXECUTION_FILTERS_URL_PARAM_KEY
    );
    return persisted ? persisted.map(convertCamelCasedKeysToSnakeCase) : undefined;
  }, [urlStorage]);

  const setControlsUrlState = useCallback(
    (next: FilterControlConfig[]) => {
      urlStorage.set(EXECUTION_FILTERS_URL_PARAM_KEY, next);
    },
    [urlStorage]
  );

  const onFilterGroupInit = useCallback((handler: FilterGroupHandler | undefined) => {
    filterGroupHandlerRef.current = handler;

    if (handler && pendingWorkflowIdRef.current) {
      updateWorkflowIdSelectedOptions(pendingWorkflowIdRef.current, handler);
      pendingWorkflowIdRef.current = null;
    }
  }, []);

  const applyWorkflowIdFilter = useCallback(
    (workflowId: string) => {
      const currentConfigs = controlsUrlState ?? DEFAULT_EXECUTION_PAGE_FILTERS;
      const updatedConfigs = setWorkflowIdOnControlConfigs(workflowId, [...currentConfigs]);

      setControlsUrlState(updatedConfigs);

      if (filterGroupHandlerRef.current) {
        updateWorkflowIdSelectedOptions(workflowId, filterGroupHandlerRef.current);
      } else {
        pendingWorkflowIdRef.current = workflowId;
      }
    },
    [controlsUrlState, setControlsUrlState]
  );

  return {
    applyWorkflowIdFilter,
    controlsUrlState,
    onFilterGroupInit,
    setControlsUrlState,
  };
};
