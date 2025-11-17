/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';

import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { buildContextOverride } from '../../../shared/utils/build_step_context_override/build_step_context_override';

export function buildContextOverrideForStep(
  workflowGraph: WorkflowGraph,
  workflowDefinition: WorkflowYaml,
  stepId: string
): ContextOverrideData {
  const stepSubGraph = workflowGraph.getStepGraph(stepId);
  return buildContextOverride(stepSubGraph, {
    consts: workflowDefinition.consts,
    workflow: {
      id: generateUuid(),
      name: workflowDefinition.name,
      enabled: workflowDefinition.enabled || true,
      spaceId: 'default', // TODO: figure out where to get the spaceId from
    },
  });
}
