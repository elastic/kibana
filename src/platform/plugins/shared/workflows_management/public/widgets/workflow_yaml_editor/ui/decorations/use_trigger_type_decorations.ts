/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import type { Document, Pair, Scalar } from 'yaml';
import { isPair, isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getTriggerNodesWithType } from '../../../../../common/lib/yaml';

interface UseTriggerTypeDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  yamlDocument: Document | null;
  isEditorMounted: boolean;
}

// Helper function to get trigger icon class
const getTriggerIcon = (triggerType: string): { className: string } => {
  switch (triggerType) {
    case 'alert':
      return { className: 'alert' };
    case 'scheduled':
      return { className: 'scheduled' };
    case 'manual':
      return { className: 'manual' };
    default:
      return { className: triggerType };
  }
};

export const useTriggerTypeDecorations = ({
  editor,
  yamlDocument,
  isEditorMounted,
}: UseTriggerTypeDecorationsProps) => {
  const triggerTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    if (!isEditorMounted || !editor || !yamlDocument) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const model = editor.getModel();
      if (!model) return;

      // Clear existing trigger decorations
      if (triggerTypeDecorationCollectionRef.current) {
        triggerTypeDecorationCollectionRef.current.clear();
        triggerTypeDecorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Find all triggers with type
      const triggerNodes = getTriggerNodesWithType(yamlDocument);

      for (const triggerNode of triggerNodes) {
        const typePair = triggerNode.items.find(
          (item): item is Pair<Scalar, Scalar> =>
            isPair(item) && isScalar(item.key) && isScalar(item.value) && item.key.value === 'type'
        );
        if (!typePair?.value?.value) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const triggerType = typePair.value.value;

        if (typeof triggerType !== 'string') {
          // eslint-disable-next-line no-continue
          continue;
        }

        // Skip decoration for very short trigger types to avoid false matches
        if (triggerType.length < 3) {
          // eslint-disable-next-line no-continue
          continue; // Skip this iteration
        }

        const typeRange = typePair.value.range;

        if (!typeRange || !Array.isArray(typeRange) || typeRange.length < 3) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // Get icon and class based on trigger type
        const { className } = getTriggerIcon(triggerType);

        if (className) {
          // typeRange format: [startOffset, valueStartOffset, endOffset]
          const valueStartOffset = typeRange[1]; // Start of the value (after quotes if present)
          const valueEndOffset = typeRange[2]; // End of the value

          // Convert character offsets to Monaco positions
          const startPosition = model.getPositionAt(valueStartOffset);
          const endPosition = model.getPositionAt(valueEndOffset);

          // Get the line content to check if "type:" is at the beginning
          const currentLineContent = model.getLineContent(startPosition.lineNumber);
          const trimmedLine = currentLineContent.trimStart();

          // Check if this line contains "type:" (after whitespace and optional dash for array items)
          if (!trimmedLine.startsWith('type:') && !trimmedLine.startsWith('- type:')) {
            // eslint-disable-next-line no-continue
            continue; // Skip this decoration
          }

          // Try to find the trigger type in the start position line first
          let targetLineNumber = startPosition.lineNumber;
          let lineContent = model.getLineContent(targetLineNumber);
          let typeIndex = lineContent.indexOf(triggerType);

          // If not found on start line, check end line
          if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
            targetLineNumber = endPosition.lineNumber;
            lineContent = model.getLineContent(targetLineNumber);
            typeIndex = lineContent.indexOf(triggerType);
          }

          let actualStartColumn;
          let actualEndColumn;
          if (typeIndex !== -1) {
            // Found the trigger type in the line
            actualStartColumn = typeIndex + 1; // +1 for 1-based indexing
            actualEndColumn = typeIndex + triggerType.length + 1; // +1 for 1-based indexing
          } else {
            // Fallback to calculated position
            targetLineNumber = startPosition.lineNumber;
            actualStartColumn = startPosition.column;
            actualEndColumn = endPosition.column;
          }

          // Background highlighting for trigger types
          const decorationsToAdd = [
            // Background highlighting on the trigger type text
            {
              range: {
                startLineNumber: targetLineNumber,
                startColumn: actualStartColumn,
                endLineNumber: targetLineNumber,
                endColumn: actualEndColumn,
              },
              options: {
                inlineClassName: `type-inline-highlight type-${className}`,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              },
            },
          ];

          decorations.push(...decorationsToAdd);
        }
      }

      if (decorations.length > 0) {
        triggerTypeDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
      }
    }, 100); // Small delay to avoid multiple rapid executions

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument, editor]);

  // Return ref for cleanup purposes
  return {
    decorationCollectionRef: triggerTypeDecorationCollectionRef,
  };
};
