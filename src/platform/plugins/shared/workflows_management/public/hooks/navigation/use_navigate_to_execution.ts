/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { ExecutionStatus } from '@kbn/workflows';
import { PLUGIN_ID } from '../../../common';
import { useKibana } from '../use_kibana';

/** Minimal execution info needed to link to a workflow execution (child or parent). */
export interface WorkflowExecutionLinkInfo {
  workflowId: string;
  executionId: string;
  workflowName: string;
  status: ExecutionStatus;
}

export interface UseNavigateToExecutionParams {
  workflowId: string;
  executionId?: string;
}

/**
 * Returns navigate function and href for the workflow executions view.
 * Use href on a link so users can see the destination and open in a new tab;
 * use onClick with preventDefault for SPA navigation.
 */
export function useNavigateToExecution(params: UseNavigateToExecutionParams): {
  navigate: () => void;
  href: string;
} {
  const { workflowId, executionId } = params;
  const { application } = useKibana().services;

  const path = useMemo(() => {
    const base = `/${workflowId}`;
    if (executionId) {
      return `${base}?tab=executions&executionId=${executionId}`;
    }
    return `${base}?tab=executions`;
  }, [workflowId, executionId]);

  const href = useMemo(() => application.getUrlForApp(PLUGIN_ID, { path }), [application, path]);

  const navigate = useCallback(() => {
    application.navigateToApp(PLUGIN_ID, { path });
  }, [application, path]);

  return { navigate, href };
}
