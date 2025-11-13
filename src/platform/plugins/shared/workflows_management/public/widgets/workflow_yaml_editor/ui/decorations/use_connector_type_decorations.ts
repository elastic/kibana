/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Document, Pair, Scalar } from 'yaml';
import { isPair, isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { isBuiltInStepType } from '@kbn/workflows';
import { getStepNodesWithType } from '../../../../../common/lib/yaml';
import { getCachedAllConnectorsMap } from '../../../../../common/schema';
import { getBaseConnectorType } from '../../../../shared/ui/step_icons/get_base_connector_type';

interface UseConnectorTypeDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  yamlDocument: Document | null;
  isEditorMounted: boolean;
}

export const useConnectorTypeDecorations = ({
  editor,
  yamlDocument,
  isEditorMounted,
}: UseConnectorTypeDecorationsProps) => {
  const connectorTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const typeExists = useCallback((type: string) => {
    const dynamicConnectorTypes = getCachedAllConnectorsMap() || new Map();
    return isBuiltInStepType(type) || dynamicConnectorTypes.has(type);
  }, []);

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
      if (connectorTypeDecorationCollectionRef.current) {
        connectorTypeDecorationCollectionRef.current.clear();
        connectorTypeDecorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Find all steps with connector types
      const stepNodes = getStepNodesWithType(yamlDocument);
      // console.log('🎨 Connector decorations: Found step nodes:', stepNodes.length);

      for (const stepNode of stepNodes) {
        // Find the main step type (not nested inside 'with' or other blocks)
        const typePair = stepNode.items.find((item): item is Pair<Scalar, Scalar> => {
          // Must be a direct child of the step node (not nested)
          return isPair(item) && isScalar(item.key) && item.key.value === 'type';
        });

        if (!typePair || !isScalar(typePair.value)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const connectorType = typePair.value.value;

        if (typeof connectorType !== 'string') {
          // eslint-disable-next-line no-continue
          continue;
        }

        // console.log('🎨 Processing connector type:', connectorType);

        // Skip decoration for very short connector types to avoid false matches
        // allow "if" as a special case
        if (connectorType.length < 3 && connectorType !== 'if') {
          // console.log('🎨 Skipping short connector type:', connectorType);
          // eslint-disable-next-line no-continue
          continue; // Skip this iteration
        }

        const typeRange = typePair.value.range;

        if (!typeRange || !Array.isArray(typeRange) || typeRange.length < 3) {
          // eslint-disable-next-line no-continue
          continue;
        }

        if (!typeExists(connectorType)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // Get icon and class based on connector type
        const baseConnectorType = getBaseConnectorType(connectorType);

        if (baseConnectorType) {
          // typeRange format: [startOffset, valueStartOffset, endOffset]
          const valueStartOffset = typeRange[1]; // Start of the value (after quotes if present)
          const valueEndOffset = typeRange[2]; // End of the value

          // Convert character offsets to Monaco positions
          const startPosition = model.getPositionAt(valueStartOffset);
          const endPosition = model.getPositionAt(valueEndOffset);

          // Get the line content to check if "type:" is at the beginning
          const currentLineContent = model.getLineContent(startPosition.lineNumber);
          const trimmedLine = currentLineContent.trimStart();

          // Check if this line starts with "type:" (after whitespace)
          if (!trimmedLine.startsWith('type:')) {
            // eslint-disable-next-line no-continue
            continue; // Skip this decoration
          }

          // Try to find the connector type in the start position line first
          let targetLineNumber = startPosition.lineNumber;
          let lineContent = model.getLineContent(targetLineNumber);
          let typeIndex = lineContent.indexOf(connectorType);

          // If not found on start line, check end line
          if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
            targetLineNumber = endPosition.lineNumber;
            lineContent = model.getLineContent(targetLineNumber);
            typeIndex = lineContent.indexOf(connectorType);
          }

          let actualStartColumn;
          let actualEndColumn;
          if (typeIndex !== -1) {
            // Found the connector type in the line
            actualStartColumn = typeIndex + 1; // +1 for 1-based indexing
            actualEndColumn = typeIndex + connectorType.length + 1; // +1 for 1-based indexing
          } else {
            // Fallback to calculated position
            targetLineNumber = startPosition.lineNumber;
            actualStartColumn = startPosition.column;
            actualEndColumn = endPosition.column;
          }

          // Background highlighting and after content (working version)
          const decorationsToAdd = [
            // Background highlighting on the connector type text
            {
              range: {
                startLineNumber: targetLineNumber,
                startColumn: actualStartColumn,
                endLineNumber: targetLineNumber,
                endColumn: actualEndColumn,
              },
              options: {
                inlineClassName: `type-inline-highlight type-${baseConnectorType}`,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              },
            },
          ];

          decorations.push(...decorationsToAdd);
        }
      }

      // console.log('🎨 Final decorations count:', decorations.length);
      if (decorations.length > 0) {
        connectorTypeDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
        // console.log('🎨 Applied connector decorations successfully');
      } else {
        // console.log('🎨 No decorations to apply');
      }
    }, 100); // Small delay to avoid multiple rapid executions

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument, editor, typeExists]);

  // Return ref for cleanup purposes
  return {
    decorationCollectionRef: connectorTypeDecorationCollectionRef,
  };
};
