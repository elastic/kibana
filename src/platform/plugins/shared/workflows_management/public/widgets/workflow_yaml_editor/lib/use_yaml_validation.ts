/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { useCallback, useState } from 'react';
import { parseDocument } from 'yaml';
import _ from 'lodash';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml-utils';
import { YamlValidationError, YamlValidationErrorSeverity } from '../model/types';
import { MUSTACHE_REGEX } from './mustache';
import { MarkerSeverity, getSeverityString } from './utils';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getContextForPath } from '../../../features/workflow_context/lib/get_context_for_path';

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
  validationErrors: YamlValidationError[] | null;
  validateVariables: (model: monaco.editor.ITextModel | null) => void;
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
  const [validationErrors, setValidationErrors] = useState<YamlValidationError[] | null>(null);

  // Function to validate mustache expressions and apply decorations
  const validateVariables = useCallback((model: monaco.editor.ITextModel | null) => {
    if (!model) {
      return;
    }

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

      const matches = [...text.matchAll(MUSTACHE_REGEX)];
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
        const context = getContextForPath(result.data, workflowGraph, path);

        // TODO: validate mustache variable for YAML step
        if (!_.get(context, match[1])) {
          errorMessage = `Variable ${match[1]} is not defined`;
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
        }
      }

      // Set markers on the model for the problems panel
      monaco.editor.setModelMarkers(model, 'mustache-validation', markers);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }, []);

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
    validationErrors,
    validateVariables,
    handleMarkersChanged,
  };
}
