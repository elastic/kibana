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
import { parseDocument } from 'yaml';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import type { YamlValidationError, YamlValidationErrorSeverity } from '../model/types';
import { MUSTACHE_REGEX_GLOBAL } from '../../../../common/lib/regex';
import { MarkerSeverity, getSeverityString } from './utils';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getContextSchemaForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import { isValidSchemaPath } from '../../../../common/lib/zod_utils';
import { parseVariablePath } from '../../../../common/lib/parse_variable_path';

interface UseYamlValidationProps {
  workflowYamlSchema: z.ZodSchema;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
}

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Hint,
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
        if (!result.success) {
          throw new Error('Failed to parse YAML');
        }
        const yamlDocument = parseDocument(text);
        const workflowGraph = getWorkflowGraph(result.data);

        // Collect markers to add to the model
        const markers: monaco.editor.IMarkerData[] = [];

        const matches = [...text.matchAll(MUSTACHE_REGEX_GLOBAL)];
        // TODO: check if the variable is inside quouted string or yaml | or > string section
        for (const match of matches) {
          const matchStart = match.index ?? 0;
          const matchEnd = matchStart + match[0].length; // match[0] is the entire {{...}} expression

          // Get the position (line, column) for the match
          const startPos = model.getPositionAt(matchStart);
          const endPos = model.getPositionAt(matchEnd);

          let errorMessage: string | null = null;
          const severity: YamlValidationErrorSeverity = 'warning';

          const path = getCurrentPath(yamlDocument, matchStart);
          const context = getContextSchemaForPath(result.data, workflowGraph, path);

          if (!match.groups?.key) {
            errorMessage = `Variable is not defined`;
          } else {
            const parsedPath = parseVariablePath(match.groups.key);
            if (parsedPath?.errors) {
              errorMessage = parsedPath.errors.join(', ');
            }
            if (parsedPath?.propertyPath) {
              if (!isValidSchemaPath(context, parsedPath.propertyPath)) {
                errorMessage = `Variable ${parsedPath.propertyPath} is invalid`;
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
              source: 'mustache-validation',
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
              },
            });
          }
        }

        if (decorationsCollection.current) {
          decorationsCollection.current.clear();
        }
        decorationsCollection.current = editor.createDecorationsCollection(decorations);

        // Set markers on the model for the problems panel
        monaco.editor.setModelMarkers(model, 'mustache-validation', markers);
      } catch (e) {
        setError(e as Error);
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
        errors.push({
          message: marker.message,
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
    [onValidationErrors]
  );

  return {
    error,
    validationErrors,
    validateVariables,
    handleMarkersChanged,
  };
}
