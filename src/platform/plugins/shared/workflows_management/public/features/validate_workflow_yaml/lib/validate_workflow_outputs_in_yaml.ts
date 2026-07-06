/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isPair, isScalar } from 'yaml';
import type { Document, Node, YAMLMap } from 'yaml';
import type { monaco } from '@kbn/monaco';
import {
  type NormalizableFieldSchema,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import { getStepNodesWithType } from '../../../../common/lib/yaml/get_step_nodes_with_type';
import { getMonacoRangeFromYamlNode } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { validateWorkflowFields } from '../../../widgets/workflow_yaml_editor/lib/validation/validate_workflow_fields';
import type { YamlValidationResult } from '../model/types';

interface WorkflowOutputStepItem {
  id: string;
  yamlNode: Node;
  withNode: Node | null;
  /** Key node of the 'with' pair (for underlining only the "with:" line when required field is missing) */
  withKeyNode: Node | null;
  withValues: Record<string, unknown>;
  model: monaco.editor.ITextModel;
}

function getStepType(stepNode: YAMLMap): string | null {
  const typePair = stepNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
  );
  if (typePair && isPair(typePair) && isScalar(typePair.value)) {
    return String(typePair.value.value);
  }
  return null;
}

function collectWorkflowOutputStepFromNode(
  stepNode: YAMLMap,
  items: WorkflowOutputStepItem[],
  model: monaco.editor.ITextModel
): void {
  const withPair = stepNode.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );

  let withNode: Node | null = null;
  const withValues: Record<string, unknown> = {};

  let withKeyNode: Node | null = null;
  if (withPair && isPair(withPair)) {
    withNode = withPair.value as Node;
    if (isScalar(withPair.key)) {
      withKeyNode = withPair.key;
    }

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
            value = {};
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
    withKeyNode,
    withValues,
    model,
  });
}

/**
 * Collects all workflow.output steps from the YAML document using the shared AST visitor.
 * Covers steps at any nesting depth (if, foreach, while, on-failure, etc.).
 */
function collectWorkflowOutputSteps(
  yamlDocument: Document,
  model: monaco.editor.ITextModel
): WorkflowOutputStepItem[] {
  const allStepNodes = getStepNodesWithType(yamlDocument);
  const outputStepNodes = allStepNodes.filter((node) => getStepType(node) === 'workflow.output');
  const items: WorkflowOutputStepItem[] = [];
  for (const node of outputStepNodes) {
    collectWorkflowOutputStepFromNode(node, items, model);
  }
  return items;
}

/**
 * Reads the outputs section from the raw YAML document as a plain object or array.
 * Used when workflowDefinition.outputs is missing so we can still validate workflow.output
 * steps. That happens when:
 * - The workflow YAML fails schema parse (e.g. structural error) and the parsed
 *   workflow definition is undefined or stripped.
 * - Validations run before the full workflow graph/definition is available.
 * In those cases the editor still has the raw yamlDocument; we read `outputs` from it
 * so workflow.output `with:` validation can run.
 * Supports both JSON Schema format (object with properties) and legacy array format
 * ([{ name, type, required?, ... }]) so that either declaration style is validated.
 * Exported for use by autocomplete (get_workflow_outputs_suggestions) when workflowDefinition.outputs is undefined.
 */
export function getOutputsFromYamlDocument(
  yamlDocument: Document
): NormalizableFieldSchema | undefined {
  const outputsNode = yamlDocument.get('outputs', true);
  if (outputsNode == null) return undefined;
  const plain =
    typeof (outputsNode as Node).toJSON === 'function'
      ? (outputsNode as Node).toJSON()
      : outputsNode;
  if (!plain || typeof plain !== 'object') return undefined;

  // JSON Schema format: { properties: { ... } }
  if (
    !Array.isArray(plain) &&
    'properties' in plain &&
    typeof (plain as Record<string, unknown>).properties === 'object'
  ) {
    return plain as NormalizableFieldSchema;
  }

  // Legacy array format: [{ name, type, required?, ... }]
  if (
    Array.isArray(plain) &&
    plain.length > 0 &&
    plain.every(
      (item) => item != null && typeof item === 'object' && 'name' in item && 'type' in item
    )
  ) {
    return plain as NormalizableFieldSchema;
  }

  return undefined;
}

/**
 * Validates workflow.output steps against the workflow's declared outputs
 */
export function validateWorkflowOutputsInYaml(
  yamlDocument: Document,
  model: monaco.editor.ITextModel,
  workflowOutputs: NormalizableFieldSchema | undefined
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  const outputsSchema = workflowOutputs ?? getOutputsFromYamlDocument(yamlDocument);
  const normalized = normalizeFieldsToJsonSchema(outputsSchema);
  if (!normalized?.properties || Object.keys(normalized.properties).length === 0) {
    return results;
  }

  const outputSteps = collectWorkflowOutputSteps(yamlDocument, model);

  for (const outputStep of outputSteps) {
    const validation = validateWorkflowFields(outputStep.withValues, outputsSchema, 'output');

    if (!validation.isValid) {
      for (const error of validation.errors) {
        const errorNode = error.fieldName
          ? findFieldNodeInWith(outputStep.withNode, error.fieldName)
          : outputStep.withNode;

        let range: ReturnType<typeof getMonacoRangeFromYamlNode> = null;
        if (errorNode) {
          range = getMonacoRangeFromYamlNode(model, errorNode);
        } else if (error.fieldName && outputStep.withKeyNode?.range) {
          range = getMonacoRangeFromYamlNode(model, outputStep.withKeyNode);
        } else if (outputStep.yamlNode.range) {
          range = getMonacoRangeFromYamlNode(model, outputStep.yamlNode);
        }

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
