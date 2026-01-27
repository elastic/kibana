/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { DynamicStepContextSchema, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { validateVariable } from './validate_variable';
import { getContextSchemaForPath } from '../../workflow_context/lib/get_context_for_path';
import type { VariableItem, YamlValidationResult } from '../model/types';

export function validateVariables(
  variableItems: VariableItem[],
  workflowGraph: WorkflowGraph,
  workflowDefinition: WorkflowYaml,
  yamlDocument?: Document | null
): YamlValidationResult[] {
  const errors: YamlValidationResult[] = [];

  for (const variableItem of variableItems) {
    const { yamlPath: path } = variableItem;

    let context: typeof DynamicStepContextSchema;
    try {
      context = getContextSchemaForPath(workflowDefinition, workflowGraph, path, yamlDocument);
      const error = validateVariable(variableItem, context);
      if (error) {
        errors.push(error);
      }
    } catch (e) {
      errors.push({
        ...variableItem,
        message: 'Failed to get context schema for path',
        severity: 'error',
        owner: 'variable-validation',
        hoverMessage: null,
      });
    }
  }

  return errors;
}
