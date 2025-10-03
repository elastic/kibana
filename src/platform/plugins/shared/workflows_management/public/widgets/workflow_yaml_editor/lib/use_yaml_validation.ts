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
import { isPair, isScalar, parseDocument, visit } from 'yaml';
import { WorkflowGraph, isEnterForeach } from '@kbn/workflows/graph';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';
import {
  parseWorkflowYamlToJSON,
  formatValidationError,
  getCurrentPath,
  getPathFromAncestors,
  getStepNode,
} from '../../../../common/lib/yaml_utils';
import { VARIABLE_REGEX_GLOBAL } from '../../../../common/lib/regex';
import {
  getSchemaAtPath,
  getZodTypeName,
  getDetailedTypeDescription,
} from '../../../../common/lib/zod';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import type { YamlValidationError, YamlValidationErrorSeverity } from '../model/types';
import { MarkerSeverity, getSeverityString } from './utils';
import type { MockZodError } from '../../../../common/lib/errors/invalid_yaml_schema';

interface RawVariableItem {
  start: number;
  end: number;
  key: string | null;
}

interface UseYamlValidationProps {
  workflowYamlSchema: z.ZodSchema;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
}

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Hint,
};

interface StepNameInfo {
  name: string;
  node: any;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

const collectAllStepNames = (yamlDocument: any): StepNameInfo[] => {
  const stepNames: StepNameInfo[] = [];

  if (!yamlDocument?.contents) return stepNames;

  visit(yamlDocument, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }

      const lastAncestor = ancestors?.[ancestors.length - 1];
      const isNameProp =
        isPair(lastAncestor) && isScalar(lastAncestor.key) && lastAncestor.key.value === 'name';

      if (!isNameProp || !node.value) {
        return;
      }

      // Make sure we're looking at the VALUE of a name property, not the key itself
      // The key "name" will also be a scalar, but it will be the key of the pair, not the value
      const isNameValue = isPair(lastAncestor) && lastAncestor.value === node;

      if (!isNameValue) {
        return;
      }

      // Use the same logic as getStepNode to identify step names
      const path = getPathFromAncestors(ancestors);
      const isInSteps =
        path.length >= 3 && (path[path.length - 3] === 'steps' || path[path.length - 3] === 'else');

      if (isInSteps) {
        const [startOffset, endOffset] = node.range;

        // Convert byte offsets to line/column positions
        const text = yamlDocument.toString();
        let line = 1;
        let column = 1;
        let startLine = 1;
        let startCol = 1;
        let endLine = 1;
        let endCol = 1;

        for (let i = 0; i < text.length; i++) {
          if (i === startOffset) {
            startLine = line;
            startCol = column;
          }
          if (i === endOffset) {
            endLine = line;
            endCol = column;
            break;
          }
          if (text[i] === '\n') {
            line++;
            column = 1;
          } else {
            column++;
          }
        }

        stepNames.push({
          name: node.value as string,
          node,
          startLineNumber: startLine,
          startColumn: startCol,
          endLineNumber: endLine,
          endColumn: endCol,
        });
      }
    },
  });

  return stepNames;
};

export interface UseYamlValidationResult {
  error: Error | null;
  validationErrors: YamlValidationError[] | null;
  validateVariables: (
    editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor
  ) => void;
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
  const [validationErrors, setValidationErrors] = useState<YamlValidationError[] | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // Function to validate mustache expressions and apply decorations
  const validateVariables = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor) => {
      const model = editor.getModel();
      if (!model) {
        return;
      }

      if ('original' in model) {
        // TODO: validate diff editor
        return;
      }

      editor = editor as monaco.editor.IStandaloneCodeEditor;

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      try {
        const text = model.getValue();

        // Parse the YAML to JSON to get the workflow definition
        const result = parseWorkflowYamlToJSON(text, workflowYamlSchema);
        const yamlDocument = parseDocument(text);
        const workflowGraph = result.success
          ? WorkflowGraph.fromWorkflowDefinition(result.data)
          : null;

        // Collect markers to add to the model
        const markers: monaco.editor.IMarkerData[] = [];

        // Validate step name uniqueness
        const stepNames = collectAllStepNames(yamlDocument);
        const stepNameCounts = new Map<string, StepNameInfo[]>();

        // Group step names by their values
        for (const stepInfo of stepNames) {
          const existing = stepNameCounts.get(stepInfo.name);
          if (existing) {
            existing.push(stepInfo);
          } else {
            stepNameCounts.set(stepInfo.name, [stepInfo]);
          }
        }

        // Add markers for duplicate step names
        for (const [stepName, occurrences] of stepNameCounts) {
          if (occurrences.length > 1) {
            for (const occurrence of occurrences) {
              markers.push({
                severity: SEVERITY_MAP.error,
                message: `Step name "${stepName}" is not unique. Found ${occurrences.length} steps with this name.`,
                startLineNumber: occurrence.startLineNumber,
                startColumn: occurrence.startColumn,
                endLineNumber: occurrence.endLineNumber,
                endColumn: occurrence.endColumn,
                source: 'step-name-validation',
              });

              // Add full line highlighting with red background
              decorations.push({
                range: new monaco.Range(
                  occurrence.startLineNumber,
                  1,
                  occurrence.startLineNumber,
                  model.getLineMaxColumn(occurrence.startLineNumber)
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
        }

        // Currently, foreach doesn't use mustache expressions, so we need to handle it separately
        // TODO: remove if/when foreach uses mustache expressions
        const foreachVariableItems = (workflowGraph?.getAllNodes() ?? [])
          .map((node) => {
            if (isEnterForeach(node)) {
              const yamlNode = getStepNode(yamlDocument, node.stepId);
              const foreachValueNode = yamlNode?.get('foreach', true);
              if (foreachValueNode && foreachValueNode.range) {
                return {
                  start: foreachValueNode.range[0],
                  end: foreachValueNode.range[2],
                  key: node.configuration.foreach,
                };
              }
            }
            return null;
          })
          .filter((foreach) => foreach) as RawVariableItem[];
        const textMatches = [...text.matchAll(VARIABLE_REGEX_GLOBAL)].map((match) => ({
          start: match.index ?? 0,
          end: (match.index ?? 0) + match[0].length, // match[0] is the entire {{...}} expression
          key: match.groups?.key ?? null,
        }));
        const variableItems = [...textMatches, ...foreachVariableItems];
        // TODO: check if the variable is inside quouted string or yaml | or > string section
        for (const variableItem of variableItems) {
          const { start, end, key } = variableItem;
          // Get the position (line, column) for the match
          const startPos = model.getPositionAt(start);
          const endPos = model.getPositionAt(end);

          let errorMessage: string | null = null;
          let hoverMessage: string | null = null;
          let severity: YamlValidationErrorSeverity = 'error';

          const path = getCurrentPath(yamlDocument, start);
          let context = null;
          if (result.success) {
            try {
              context = getContextSchemaForPath(result.data, workflowGraph!, path);
            } catch (e) {
              // Fallback to the main workflow schema if context detection fails
              context = null;
              errorMessage = e.message;
            }
          }

          if (!key) {
            errorMessage = `Variable is not defined`;
          } else {
            const parsedPath = parseVariablePath(key);
            if (!parsedPath) {
              errorMessage = `Invalid variable path: ${key}`;
            } else if (parsedPath.errors) {
              errorMessage = parsedPath.errors.join(', ');
            } else if (parsedPath?.propertyPath && !errorMessage) {
              if (!context) {
                severity = 'warning';
                errorMessage = `Variable ${parsedPath.propertyPath} cannot be validated, because the workflow schema is invalid`;
              } else {
                const refSchema = getSchemaAtPath(context, parsedPath.propertyPath);
                if (!refSchema) {
                  errorMessage = `Variable ${parsedPath.propertyPath} is invalid`;
                } else if (getZodTypeName(refSchema) === 'unknown') {
                  hoverMessage = `<pre>(property) ${
                    parsedPath.propertyPath
                  }: ${getDetailedTypeDescription(refSchema)}</pre>`;
                  severity = 'warning';
                  errorMessage = `Variable ${parsedPath.propertyPath} cannot be validated, because it's type is unknown`;
                }
              }
            }
          }

          // Add marker for validation issues
          if (errorMessage) {
            markers.push({
              severity: SEVERITY_MAP[severity],
              message: errorMessage,
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
              source: 'variable-validation',
            });

            decorations.push({
              range: new monaco.Range(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column
              ),
              options: {
                inlineClassName: 'template-variable-error',
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                hoverMessage: hoverMessage ? createMarkdownContent(hoverMessage) : null,
              },
            });
          } else {
            decorations.push({
              range: new monaco.Range(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column
              ),
              options: {
                inlineClassName: 'template-variable-valid',
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                hoverMessage: hoverMessage ? createMarkdownContent(hoverMessage) : null,
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
      } catch (e) {
        setError(new Error('Error validating variables'));
      }
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

      const errors: YamlValidationError[] = [];
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

        errors.push({
          message: formattedMessage,
          severity: getSeverityString(marker.severity as MarkerSeverity),
          lineNumber: marker.startLineNumber,
          column: marker.startColumn,
          owner,
        });
      }
      const errorsUpdater = (prevErrors: YamlValidationError[] | null) => {
        const prevOtherOwners = prevErrors?.filter((e) => e.owner !== owner);
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

function createMarkdownContent(content: string): monaco.IMarkdownString {
  return {
    value: content,
    isTrusted: true,
    supportHtml: true,
  };
}
