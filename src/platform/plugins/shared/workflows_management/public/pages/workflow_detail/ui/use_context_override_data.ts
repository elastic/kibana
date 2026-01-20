/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { v4 as generateUuid } from 'uuid';
import {
  selectWorkflowDefinition,
  selectWorkflowGraph,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useSpaceId } from '../../../hooks/use_space_id';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { buildContextOverride } from '../../../shared/utils/build_step_context_override/build_step_context_override';

/**
 * Hook to get the context override data for a given step id.
 * Uses current workflow data, it should not be used in executions tab.
 */
export function useContextOverrideData() {
  const spaceId = useSpaceId();
  // Redux selectors, use only current workflow data, not execution data
  const workflowGraph = useSelector(selectWorkflowGraph);
  const workflowDefinition = useSelector(selectWorkflowDefinition);

  const getContextOverrideData = useCallback(
    (stepId: string): ContextOverrideData | null => {
      if (!workflowGraph || !workflowDefinition || !spaceId) {
        return null;
      }

      const stepSubGraph = workflowGraph.getStepGraph(stepId);
      return buildContextOverride(stepSubGraph, {
        consts: workflowDefinition.consts,
        workflow: {
          id: generateUuid(),
          name: workflowDefinition.name,
          enabled: workflowDefinition.enabled || true,
          spaceId,
        },
        inputsDefinition: workflowDefinition.inputs,
      });
    },
    [workflowGraph, workflowDefinition, spaceId]
  );

  return getContextOverrideData;
}
