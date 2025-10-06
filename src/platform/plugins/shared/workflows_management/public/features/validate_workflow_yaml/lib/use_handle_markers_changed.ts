/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { useCallback, useState } from 'react';
import type { z } from '@kbn/zod';
import type { MockZodError } from '../../../../common/lib/errors/invalid_yaml_schema';
import { formatValidationError } from '../../../../common/lib/yaml_utils';
import type { MarkerSeverity } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { getSeverityString } from '../../../widgets/workflow_yaml_editor/lib/utils';
import type { YamlValidationResult } from '../model/types';

export interface UseHandleMarkersChangedResult {
  handleMarkersChanged: (
    editor: monaco.editor.IStandaloneCodeEditor,
    modelUri: monaco.Uri,
    markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
    owner: string
  ) => void;
  validationErrors: YamlValidationResult[];
}

interface UseYamlValidationProps {
  workflowYamlSchema: z.ZodSchema;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationResult[]>>;
}

export function useHandleMarkersChanged({
  workflowYamlSchema,
  onValidationErrors,
}: UseYamlValidationProps): UseHandleMarkersChangedResult {
  const [validationErrors, setValidationErrors] = useState<YamlValidationResult[]>([]);

  const handleMarkersChanged = useCallback(
    (
      editor: monaco.editor.IStandaloneCodeEditor,
      modelUri: monaco.Uri,
      markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
      owner: string
    ) => {
      const editorUri = editor.getModel()?.uri;
      if (modelUri.path !== editorUri?.path) {
        return;
      }

      const errors: YamlValidationResult[] = [];
      for (const marker of markers) {
        let formattedMessage = marker.message;

        // Apply custom formatting to schema validation errors (from monaco-yaml)
        if (owner === 'yaml' && marker.message) {
          // Extract the actual value from the editor at the error position
          const model = editor.getModel();
          let receivedValue: string | undefined;

          if (model) {
            try {
              // Get the text at the error position
              const range = {
                startLineNumber: marker.startLineNumber,
                startColumn: marker.startColumn,
                endLineNumber: marker.endLineNumber || marker.startLineNumber,
                endColumn: marker.endColumn || marker.startColumn + 10, // fallback range
              };

              const textAtError = model.getValueInRange(range);

              // Try to extract the value (remove quotes if present)
              const valueMatch = textAtError.match(/^\s*([^:\s]+)/);
              if (valueMatch) {
                receivedValue = valueMatch[1].replace(/['"]/g, '');
              }
            } catch (e) {
              // Fallback to parsing the message
              receivedValue = extractReceivedValue(marker.message);
            }
          }

          // Create a mock error object that matches our formatter's expected structure
          const mockError: MockZodError = {
            message: marker.message,
            issues: [
              {
                code: marker.message.includes('Value must be') ? 'invalid_literal' : 'unknown',
                message: marker.message,
                path: ['type'], // Assume it's a type field error for now
                received: receivedValue ?? '',
              },
            ],
          };

          const { message } = formatValidationError(mockError, workflowYamlSchema);
          formattedMessage = message;
        }

        if (
          !marker.source ||
          ![
            'step-name-validation',
            'variable-validation',
            'yaml',
            'connector-id-validation',
          ].includes(marker.source.toLowerCase())
        ) {
          continue;
        }

        const validatedSource = marker.source as YamlValidationResult['source'];

        errors.push({
          message: formattedMessage,
          severity: getSeverityString(marker.severity as MarkerSeverity),
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
          id: `${marker.startLineNumber}-${marker.startColumn}-${marker.endLineNumber}-${marker.endColumn}`,
          source: validatedSource,
          hoverMessage: null,
        });
      }
      const errorsUpdater = (prevErrors: YamlValidationResult[] | null) => {
        const prevOtherOwners = prevErrors?.filter(
          (e) => e.source.toLowerCase() !== owner.toLowerCase()
        );
        return [...(prevOtherOwners ?? []), ...errors];
      };
      setValidationErrors(errorsUpdater);
      onValidationErrors?.(errorsUpdater);
    },
    [onValidationErrors, workflowYamlSchema]
  );

  // Helper function to extract the received value from Monaco's error message
  function extractReceivedValue(message: string): string | undefined {
    // Try different patterns to extract the received value

    // Pattern 1: "Value must be one of: ... Received: 'value'"
    let receivedMatch = message.match(/Received:\s*['"]([^'"]+)['"]/);
    if (receivedMatch) {
      return receivedMatch[1];
    }

    // Pattern 2: "Value must be one of: ... Received: value" (without quotes)
    receivedMatch = message.match(/Received:\s*([^\s,]+)/);
    if (receivedMatch) {
      return receivedMatch[1];
    }

    // Pattern 3: Look for the actual value in the editor at the error position
    // This is more complex but might be needed if Monaco doesn't include the value in the message

    // For now, return undefined if we can't extract it
    return undefined;
  }

  return {
    validationErrors,
    handleMarkersChanged,
  };
}
