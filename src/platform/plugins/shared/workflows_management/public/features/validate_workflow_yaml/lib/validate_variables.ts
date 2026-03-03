/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { DynamicStepContextSchema, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { validateVariable } from './validate_variable';
import { getContextSchemaForPath } from '../../workflow_context/lib/get_context_for_path';
import type { VariableItem, YamlValidationResult } from '../model/types';

/**
 * If the variable item has no offset, try to compute it on the fly from the editor model.
 */
function fallbackForOffsetValue(
  variableItem: VariableItem,
  yamlDocument?: Document | null,
  model?: monaco.editor.ITextModel
) {
  if (yamlDocument && model) {
    return model?.getOffsetAt({
      lineNumber: variableItem.startLineNumber,
      column: variableItem.startColumn,
    });
  }
  return undefined;
}

export function validateVariables(
  variableItems: VariableItem[],
  workflowGraph: WorkflowGraph,
  workflowDefinition: WorkflowYaml,
  yamlDocument?: Document | null,
  model?: monaco.editor.ITextModel
): YamlValidationResult[] {
  const errors: YamlValidationResult[] = [];

  for (const variableItem of variableItems) {
    const { yamlPath: path, offset } = variableItem;

    let context: typeof DynamicStepContextSchema;
    try {
      const variableOffset = offset ?? fallbackForOffsetValue(variableItem, yamlDocument, model);
      context = getContextSchemaForPath(
        workflowDefinition,
        workflowGraph,
        path,
        yamlDocument,
        variableOffset
      );

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
