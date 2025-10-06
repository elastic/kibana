/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { z } from '@kbn/zod';
import { useCallback, useRef, useState } from 'react';
import { parseDocument, type Document } from 'yaml';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { parseWorkflowYamlToJSON, formatValidationError } from '../../../../common/lib/yaml_utils';
import type { YamlValidationResult } from '../model/types';
import { MarkerSeverity, getSeverityString } from '../../../widgets/workflow_yaml_editor/lib/utils';
import type { MockZodError } from '../../../../common/lib/errors/invalid_yaml_schema';
import { validateStepNameUniqueness } from './validate_step_name_uniqueness';
import { validateVariables as validateVariablesInternal } from './validate_variables';
import { collectAllVariables } from './collect_all_variables';

interface UseYamlValidationProps {
  workflowYamlSchema: z.ZodSchema;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationResult[]>>;
}

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Hint,
};

export interface UseYamlValidationResult {
  error: Error | null;
  validationErrors: YamlValidationResult[] | null;
  validateVariables: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  handleMarkersChanged: (
    editor: monaco.editor.IStandaloneCodeEditor,
    modelUri: monaco.Uri,
    markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
    owner: string
  ) => void;
}

export function useYamlValidation({
  workflowYamlSchema,
  onValidationErrors,
}: UseYamlValidationProps): UseYamlValidationResult {
  const [error, setError] = useState<Error | null>(null);
  const [validationErrors, setValidationErrors] = useState<YamlValidationResult[] | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const validateVariables = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      const model = editor.getModel();
      if (!model) {
        return;
      }

      const { yamlDocument, workflowGraph, workflowDefinition } = getEditorState(
        model,
        workflowYamlSchema
      );

      if (!yamlDocument || !workflowGraph || !workflowDefinition) {
        setError(new Error('Error validating variables'));
        return;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      const markers: monaco.editor.IMarkerData[] = [];

      const variableItems = collectAllVariables(model, yamlDocument, workflowGraph);

      const validationResults: YamlValidationResult[] = [
        validateStepNameUniqueness(yamlDocument),
        validateVariablesInternal(variableItems, workflowGraph, workflowDefinition),
      ].flat();

      for (const validationResult of validationResults) {
        if (
          validationResult.source === 'variable-validation' &&
          validationResult.severity === null
        ) {
          // handle valid variables
          decorations.push({
            range: new monaco.Range(
              validationResult.startLineNumber,
              validationResult.startColumn,
              validationResult.endLineNumber,
              validationResult.endColumn
            ),
            options: {
              inlineClassName: `template-variable-valid`,
              hoverMessage: validationResult.hoverMessage
                ? createMarkdownContent(validationResult.hoverMessage)
                : null,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          });
        } else if (
          validationResult.source === 'variable-validation' &&
          validationResult.severity !== null
        ) {
          // handle invalid variables
          markers.push({
            severity: SEVERITY_MAP[validationResult.severity],
            message: validationResult.message,
            startLineNumber: validationResult.startLineNumber,
            startColumn: validationResult.startColumn,
            endLineNumber: validationResult.endLineNumber,
            endColumn: validationResult.endColumn,
            source: 'variable-validation',
          });

          decorations.push({
            range: new monaco.Range(
              validationResult.startLineNumber,
              validationResult.startColumn,
              validationResult.endLineNumber,
              validationResult.endColumn
            ),
            options: {
              inlineClassName: `template-variable-${validationResult.severity}`,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              hoverMessage: validationResult.hoverMessage
                ? createMarkdownContent(validationResult.hoverMessage)
                : null,
            },
          });
        } else if (validationResult.source === 'step-name-validation') {
          markers.push({
            severity: SEVERITY_MAP[validationResult.severity],
            message: validationResult.message,
            startLineNumber: validationResult.startLineNumber,
            startColumn: validationResult.startColumn,
            endLineNumber: validationResult.endLineNumber,
            endColumn: validationResult.endColumn,
            source: 'step-name-validation',
          });
          // Add full line highlighting with red background
          decorations.push({
            range: new monaco.Range(
              validationResult.startLineNumber,
              1,
              validationResult.startLineNumber,
              model.getLineMaxColumn(validationResult.startLineNumber)
            ),
            options: {
              className: 'duplicate-step-name-error',
              marginClassName: 'duplicate-step-name-error-margin',
              isWholeLine: true,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          });
        }
      }

      if (decorationsCollection.current) {
        decorationsCollection.current.clear();
      }
      decorationsCollection.current = editor.createDecorationsCollection(decorations);

      // Set markers on the model for the problems panel
      monaco.editor.setModelMarkers(
        model,
        'variable-validation',
        markers.filter((m) => m.source === 'variable-validation')
      );
      monaco.editor.setModelMarkers(
        model,
        'step-name-validation',
        markers.filter((m) => m.source === 'step-name-validation')
      );
      setError(null);
    },
    [workflowYamlSchema]
  );

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
          !['step-name-validation', 'variable-validation', 'monaco-yaml'].includes(marker.source)
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
        const prevOtherOwners = prevErrors?.filter((e) => e.source !== owner);
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
    error,
    validationErrors,
    validateVariables,
    handleMarkersChanged,
  };
}

// Will be replaced with a editor state hook
function getEditorState(model: monaco.editor.ITextModel, workflowYamlSchema: z.ZodSchema) {
  let yamlDocument: Document;
  let workflowGraph: WorkflowGraph | null;
  let workflowDefinition: WorkflowYaml | null;

  const text = model.getValue();

  try {
    // Parse the YAML to JSON to get the workflow definition
    const result = parseWorkflowYamlToJSON(text, workflowYamlSchema);
    yamlDocument = parseDocument(text);
    workflowGraph = result.success ? WorkflowGraph.fromWorkflowDefinition(result.data) : null;
    workflowDefinition = result.success ? result.data : null;
  } catch (e) {
    // return null values if the YAML is invalid
    return { yamlDocument: null, workflowGraph: null, workflowDefinition: null };
  }
  return { yamlDocument, workflowGraph, workflowDefinition };
}

function createMarkdownContent(content: string): monaco.IMarkdownString {
  return {
    value: content,
    isTrusted: true,
    supportHtml: true,
  };
}
