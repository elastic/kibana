/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isPair, isScalar, isSeq } from 'yaml';
import type { Document, Node, YAMLSeq } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { WorkflowOutput } from '@kbn/workflows';
import { getMonacoRangeFromYamlNode } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { validateWorkflowFields } from '../../../widgets/workflow_yaml_editor/lib/validation/validate_workflow_fields';
import type { YamlValidationResult } from '../model/types';

interface WorkflowOutputStepItem {
  id: string;
  yamlNode: Node;
  withNode: Node | null;
  withValues: Record<string, unknown>;
  model: monaco.editor.ITextModel;
}

/**
 * Collects all workflow.output steps from the YAML document
 */
function collectWorkflowOutputSteps(
  yamlDocument: Document,
  model: monaco.editor.ITextModel
): WorkflowOutputStepItem[] {
  const items: WorkflowOutputStepItem[] = [];
  const stepsNode = yamlDocument.get('steps', true);

  if (!stepsNode || !isSeq(stepsNode)) {
    return items;
  }

  const stepsSeq = stepsNode as YAMLSeq;

  for (const stepNode of stepsSeq.items) {
    if (isMap(stepNode)) {
      // Check if this is a workflow.output step
      const typePair = stepNode.items.find(
        (item) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
      );

      if (typePair && isPair(typePair) && isScalar(typePair.value)) {
        if (typePair.value.value === 'workflow.output') {
          // Find the 'with' property
          const withPair = stepNode.items.find(
            (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
          );

          let withNode: Node | null = null;
          const withValues: Record<string, unknown> = {};

          if (withPair && isPair(withPair)) {
            withNode = withPair.value as Node;

            // Extract values from the with block
            if (isMap(withPair.value)) {
              withPair.value.items.forEach((item) => {
                if (isPair(item) && isScalar(item.key)) {
                  const key = String(item.key.value);
                  let value: unknown = null;

                  if (isScalar(item.value)) {
                    value = item.value.value;
                  } else if (Array.isArray(item.value)) {
                    value = item.value;
                  } else if (isMap(item.value)) {
                    value = {}; // Object
                  }

                  withValues[key] = value;
                }
              });
            }
          }

          const stepRange = stepNode.range;
          const stepId = stepRange
            ? `workflow-output-${stepRange[0]}-${stepRange[2]}`
            : `workflow-output-${items.length}`;

          items.push({
            id: stepId,
            yamlNode: stepNode,
            withNode,
            withValues,
            model,
          });
        }
      }
    }
  }

  return items;
}

/**
 * Validates workflow.output steps against the workflow's declared outputs
 */
export function validateWorkflowOutputsInYaml(
  yamlDocument: Document,
  model: monaco.editor.ITextModel,
  workflowOutputs: WorkflowOutput[] | undefined
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  if (!workflowOutputs || workflowOutputs.length === 0) {
    // No outputs declared, no validation needed
    return results;
  }

  const outputSteps = collectWorkflowOutputSteps(yamlDocument, model);

  for (const outputStep of outputSteps) {
    const validation = validateWorkflowFields(outputStep.withValues, workflowOutputs, 'output');

    if (!validation.isValid) {
      for (const error of validation.errors) {
        const errorNode = error.fieldName
          ? findFieldNodeInWith(outputStep.withNode, error.fieldName)
          : outputStep.withNode;

        const range = errorNode
          ? getMonacoRangeFromYamlNode(model, errorNode)
          : outputStep.yamlNode.range
          ? {
              startLineNumber: model.getPositionAt(outputStep.yamlNode.range[0]).lineNumber,
              startColumn: model.getPositionAt(outputStep.yamlNode.range[0]).column,
              endLineNumber: model.getPositionAt(outputStep.yamlNode.range[2]).lineNumber,
              endColumn: model.getPositionAt(outputStep.yamlNode.range[2]).column,
            }
          : null;

        if (range) {
          // Prefix field name to the error message for clarity
          const message = error.fieldName
            ? `"${error.fieldName}": ${error.message}`
            : error.message;

          results.push({
            id: `${outputStep.id}-${error.fieldName || 'general'}`,
            owner: 'workflow-output-validation',
            severity: 'error',
            message,
            hoverMessage: null,
            startLineNumber: range.startLineNumber,
            startColumn: range.startColumn,
            endLineNumber: range.endLineNumber,
            endColumn: range.endColumn,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Finds a specific field node within a 'with' map node
 */
function findFieldNodeInWith(withNode: Node | null, fieldName: string): Node | null {
  if (!withNode || !isMap(withNode)) {
    return null;
  }

  const fieldPair = withNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === fieldName
  );

  if (fieldPair && isPair(fieldPair)) {
    return fieldPair.value as Node;
  }

  return null;
}
