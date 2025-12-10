/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter, Pair, Scalar, YAMLMap } from 'yaml';
import { isPair, isScalar } from 'yaml';
import type { WorkflowsResponse } from '../../../entities/workflows/model/types';
import { validateWorkflowInputs } from '../../../widgets/workflow_yaml_editor/lib/validation/validate_workflow_inputs';
import type { WorkflowInputsItem, YamlValidationResult } from '../model/types';

/**
 * Find the specific input field's range in the YAML map
 */
function findInputFieldRange(
  inputsNode: YAMLMap | null,
  inputName: string,
  lineCounter: LineCounter | undefined
): {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
} | null {
  if (!inputsNode || !lineCounter || !inputsNode.items) {
    return null;
  }

  // Find the input field by name
  const inputPair = inputsNode.items.find(
    (item): item is Pair<Scalar, unknown> =>
      isPair(item) && isScalar(item.key) && item.key.value === inputName
  );

  if (!inputPair) {
    return null;
  }

  // Get range from the value node (the actual input value)
  const valueNode = inputPair.value;
  if (!valueNode || typeof valueNode !== 'object' || !('range' in valueNode)) {
    // Fallback to key range if value doesn't have range
    if (isScalar(inputPair.key) && inputPair.key.range) {
      const [startOffset, endOffset] = inputPair.key.range;
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);
      return {
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
      };
    }
    return null;
  }

  const range = (valueNode as { range: [number, number] }).range;
  if (!range) {
    return null;
  }

  const [startOffset, endOffset] = range;
  const startPos = lineCounter.linePos(startOffset);
  const endPos = lineCounter.linePos(endOffset);

  return {
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
  };
}

export function validateWorkflowInputsInYaml(
  workflowInputsItems: WorkflowInputsItem[],
  workflows: WorkflowsResponse,
  lineCounter: LineCounter | undefined
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  for (const item of workflowInputsItems) {
    if (item.workflowId) {
      // Get the target workflow's input definitions from Redux store
      const targetWorkflow = workflows.workflows[item.workflowId];
      if (targetWorkflow) {
        const targetWorkflowInputs = targetWorkflow.inputs;

        const validation = validateWorkflowInputs(item.inputs, targetWorkflowInputs);

        if (!validation.isValid) {
          for (const error of validation.errors) {
            let range = findInputFieldRange(item.inputsNode, error.inputName, lineCounter);

            // Fallback to the entire inputs block if we can't find the specific field
            if (!range) {
              range = {
                startLineNumber: item.startLineNumber,
                startColumn: item.startColumn,
                endLineNumber: item.endLineNumber,
                endColumn: item.endColumn,
              };
            }

            const errorMessage = error.inputName
              ? `${error.inputName}: ${error.message}`
              : error.message;

            results.push({
              id: `${item.id}-error-${error.inputName || 'unknown'}-${error.message}`,
              severity: 'error',
              message: errorMessage,
              owner: 'workflow-inputs-validation',
              startLineNumber: range.startLineNumber,
              startColumn: range.startColumn,
              endLineNumber: range.endLineNumber,
              endColumn: range.endColumn,
              hoverMessage: null,
            });
          }
        }
      }
    }
  }

  return results;
}
