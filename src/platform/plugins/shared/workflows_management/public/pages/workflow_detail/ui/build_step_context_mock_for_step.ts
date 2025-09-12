/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowGraph } from '@kbn/workflows/graph';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import type { StepContextMockData } from '../../../shared/utils/build_step_context_mock/build_step_context_mock';
import { buildStepContextMock } from '../../../shared/utils/build_step_context_mock/build_step_context_mock';

export function buildStepContextMockForStep(
  workflowYaml: string,
  stepId: string
): StepContextMockData {
  const parsingResult = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
  const stepSubGraph = WorkflowGraph.fromWorkflowDefinition(
    (parsingResult as any).data
  ).getStepGraph(stepId);
  return buildStepContextMock(stepSubGraph);
}
