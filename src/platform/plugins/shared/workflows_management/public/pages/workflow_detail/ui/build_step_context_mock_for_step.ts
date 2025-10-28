/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowGraph } from '@kbn/workflows/graph';
import { v4 as generateUuid } from 'uuid';
import { getWorkflowZodSchemaLoose } from '../../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { buildContextOverride } from '../../../shared/utils/build_step_context_override/build_step_context_override';

export function buildContextOverrideForStep(
  workflowYaml: string,
  stepId: string
): ContextOverrideData {
  const parsingResult = parseWorkflowYamlToJSON(workflowYaml, getWorkflowZodSchemaLoose());

  if (!parsingResult.success) {
    throw parsingResult.error;
  }
  const workflowDefinition = parsingResult.data;

  const stepSubGraph =
    WorkflowGraph.fromWorkflowDefinition(workflowDefinition).getStepGraph(stepId);
  return buildContextOverride(stepSubGraph, {
    consts: workflowDefinition.consts,
    workflow: {
      id: generateUuid(),
      name: workflowDefinition.name!,
      enabled: workflowDefinition.enabled || true,
      spaceId: '123',
    },
  });
}
