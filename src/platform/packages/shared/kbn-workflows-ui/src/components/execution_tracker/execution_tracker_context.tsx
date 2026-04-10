/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ExecutionTrackerApi } from './types';

interface WorkflowsManagementStart {
  trackExecutions: ExecutionTrackerApi['trackExecutions'];
}

/**
 * Returns an execution tracker API backed by the `workflowsManagement` plugin
 * start contract. Returns `null` if the plugin is not available.
 */
export const useOptionalExecutionTracker = (): ExecutionTrackerApi | null => {
  const { services } = useKibana<{
    workflowsManagement?: WorkflowsManagementStart;
  }>();
  const wm = services.workflowsManagement;

  return useMemo(() => {
    if (!wm) return null;
    return {
      executions: [],
      trackExecutions: wm.trackExecutions,
      dismissExecution: () => {},
    };
  }, [wm]);
};

export const useExecutionTracker = (): ExecutionTrackerApi => {
  const api = useOptionalExecutionTracker();
  if (!api) {
    throw new Error('useExecutionTracker: workflowsManagement plugin is not available');
  }
  return api;
};
