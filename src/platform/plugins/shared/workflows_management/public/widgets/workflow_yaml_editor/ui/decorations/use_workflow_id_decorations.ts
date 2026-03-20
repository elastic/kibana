/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { Document, Pair, Scalar, YAMLMap } from 'yaml';
import { isMap, isPair, isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getStepNodesWithType } from '../../../../../common/lib/yaml/get_step_nodes_with_type';
import { selectWorkflows } from '../../../../entities/workflows/store/workflow_detail/selectors';
import { getMonacoRangeFromYamlNode } from '../../lib/utils';

interface UseWorkflowIdDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  yamlDocument: Document | null;
  isEditorMounted: boolean;
}

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
 * Create a decoration for a workflow-id value
 * Matches the pattern used by connector-id decorations in the validation system
 */
function createWorkflowIdDecoration(
  model: monaco.editor.ITextModel,
  workflowIdPair: Pair<Scalar, Scalar>,
  workflowId: string,
  workflowName: string
): monaco.editor.IModelDeltaDecoration | null {
  if (!workflowIdPair.value || !isScalar(workflowIdPair.value)) {
    return null;
  }
  const valueRange = getMonacoRangeFromYamlNode(model, workflowIdPair.value);
  if (!valueRange) {
    return null;
  }

  const lineNumber = valueRange.startLineNumber;
  const endColumn = valueRange.startColumn + workflowId.length;
  const actualEndLine = valueRange.endLineNumber;
  const actualEndColumn = actualEndLine === lineNumber ? valueRange.endColumn : endColumn;

  return {
    range: new monaco.Range(lineNumber, valueRange.startColumn, lineNumber, actualEndColumn),
    options: {
      inlineClassName: 'template-variable-valid', // Match connector styling
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      after: {
        content: ` (${workflowName})`,
        cursorStops: monaco.editor.InjectedTextCursorStops.None,
        inlineClassName: 'after-text',
      },
    },
  };
}

/**
 * Hook to add decorations showing workflow names after workflow-id values
 * Similar to how connectors show their names
 * Uses pre-loaded workflows from Redux store (like connectors)
 */
export const useWorkflowIdDecorations = ({
  editor,
  yamlDocument,
  isEditorMounted,
}: UseWorkflowIdDecorationsProps) => {
  const decorationCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const workflows = useSelector(selectWorkflows);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isEditorMounted || !editor || !yamlDocument) {
        return;
      }

      const model = editor.getModel();
      if (!model) {
        return;
      }

      // Clear existing decorations first
      if (decorationCollectionRef.current) {
        decorationCollectionRef.current.clear();
        decorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

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
          if (workflowIdPair && workflowIdPair.value) {
            const workflowId = workflowIdPair.value.value;
            if (typeof workflowId === 'string' && workflowId) {
              // Look up workflow name from Redux store (like connectors do)
              const workflow = workflows.workflows[workflowId];
              if (workflow) {
                const decoration = createWorkflowIdDecoration(
                  model,
                  workflowIdPair,
                  workflowId,
                  workflow.name
                );
                if (decoration) {
                  decorations.push(decoration);
                }
              }
            }
          }
        }
      }

      if (decorations.length > 0) {
        decorationCollectionRef.current = editor.createDecorationsCollection(decorations);
      }
    }, 100); // Small delay to avoid multiple rapid executions

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument, editor, workflows]);

  return {
    decorationCollectionRef,
  };
};
