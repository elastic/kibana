/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, LineCounter, Pair, Scalar, YAMLMap } from 'yaml';
import { isMap, isPair, isScalar, isSeq } from 'yaml';
import { getPathFromAncestors } from '../../../../common/lib/yaml';
import { getStepNodesWithType } from '../../../../common/lib/yaml/get_step_nodes_with_type';
import type { WorkflowInputsItem } from '../model/types';

/**
 * Find the workflow-id pair from a step node
 */
function findWorkflowIdPair(stepNode: YAMLMap): Pair<Scalar, Scalar> | null {
  const withPair = stepNode.items?.find(
    (item): item is Pair<Scalar, unknown> =>
      isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );

  if (!withPair || !isMap(withPair.value)) {
    return null;
  }

  const workflowIdPair = withPair.value.items?.find(
    (item): item is Pair<Scalar, Scalar> =>
      isPair(item) && isScalar(item.key) && item.key.value === 'workflow-id'
  );

  return workflowIdPair && isScalar(workflowIdPair.value) ? workflowIdPair : null;
}

/**
 * Find the inputs pair from a step node
 */
function findInputsPair(stepNode: YAMLMap): Pair<Scalar, YAMLMap> | null {
  const withPair = stepNode.items?.find(
    (item): item is Pair<Scalar, unknown> =>
      isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );

  if (!withPair || !isMap(withPair.value)) {
    return null;
  }

  const inputsPair = withPair.value.items?.find(
    (item): item is Pair<Scalar, YAMLMap> =>
      isPair(item) && isScalar(item.key) && item.key.value === 'inputs' && isMap(item.value)
  );

  return inputsPair || null;
}

/**
 * Convert YAML map to plain object
 */
function yamlMapToObject(map: YAMLMap): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!map.items) {
    return result;
  }

  for (const item of map.items) {
    if (isPair(item) && isScalar(item.key)) {
      const key = item.key.value as string;
      const value = item.value;

      if (isScalar(value)) {
        result[key] = value.value;
      } else if (isMap(value)) {
        result[key] = yamlMapToObject(value);
      } else if (isSeq(value)) {
        // Handle sequences
        result[key] = value.items.map((seqItem) => {
          if (isScalar(seqItem)) {
            return seqItem.value;
          }
          if (isMap(seqItem)) {
            return yamlMapToObject(seqItem);
          }
          return null;
        });
      }
    }
  }

  return result;
}

export function collectAllWorkflowInputs(
  yamlDocument: Document,
  lineCounter: LineCounter | undefined
): WorkflowInputsItem[] {
  const workflowInputsItems: WorkflowInputsItem[] = [];

  if (!yamlDocument?.contents || !lineCounter) {
    return workflowInputsItems;
  }

  // Find all workflow.execute and workflow.executeAsync steps
  const stepNodes = getStepNodesWithType(yamlDocument);
  for (const stepNode of stepNodes) {
    // Find the step's type
    const typePair = stepNode.items?.find(
      (item): item is Pair<Scalar, Scalar> =>
        isPair(item) && isScalar(item.key) && item.key.value === 'type'
    );

    const stepType = typePair && isScalar(typePair.value) ? typePair.value.value : null;
    if (stepType === 'workflow.execute' || stepType === 'workflow.executeAsync') {
      const workflowIdPair = findWorkflowIdPair(stepNode);
      const inputsPair = findInputsPair(stepNode);

      const workflowId =
        workflowIdPair && isScalar(workflowIdPair.value)
          ? (workflowIdPair.value.value as string)
          : null;

      let inputs: Record<string, unknown> | undefined;
      let inputsNode: YAMLMap | null = null;
      let startLineNumber = 0;
      let startColumn = 0;
      let endLineNumber = 0;
      let endColumn = 0;

      if (inputsPair && isMap(inputsPair.value)) {
        inputsNode = inputsPair.value;
        inputs = yamlMapToObject(inputsPair.value);

        // Get range from the inputs node
        if (inputsPair.value.range) {
          const [startOffset, endOffset] = inputsPair.value.range;
          const startPos = lineCounter.linePos(startOffset);
          const endPos = lineCounter.linePos(endOffset);
          startLineNumber = startPos.line;
          startColumn = startPos.col;
          endLineNumber = endPos.line;
          endColumn = endPos.col;
        }
      } else if (workflowIdPair && isScalar(workflowIdPair.value)) {
        // If inputs don't exist, use the workflow-id value position as a fallback
        // This allows validation to show errors for missing required inputs
        if (workflowIdPair.value.range) {
          const [startOffset, endOffset] = workflowIdPair.value.range;
          const startPos = lineCounter.linePos(startOffset);
          const endPos = lineCounter.linePos(endOffset);
          startLineNumber = startPos.line;
          startColumn = startPos.col;
          endLineNumber = endPos.line;
          endColumn = endPos.col;
        }
      }

      if (startLineNumber > 0) {
        // Get the path to determine the yamlPath
        const path = getPathFromAncestors([stepNode]);

        workflowInputsItems.push({
          id: `workflow-inputs-${workflowId || 'unknown'}-${startLineNumber}-${startColumn}`,
          workflowId,
          inputs,
          inputsNode,
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn,
          yamlPath: path,
        });
      }
    }
  }

  return workflowInputsItems;
}
