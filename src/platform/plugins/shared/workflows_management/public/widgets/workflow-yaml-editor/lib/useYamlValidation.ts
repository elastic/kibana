/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { MarkerSeverity, getSeverityString } from './utils';
import { YamlValidationError, YamlValidationErrorSeverity } from '../model/types';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml-utils';
import { MUSTACHE_REGEX } from './mustache';

interface UseYamlValidationProps {
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
}

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Hint,
};

export interface UseYamlValidationResult {
  validationErrors: YamlValidationError[] | null;
  validateMustacheExpressions: (
    model: monaco.editor.ITextModel | null,
    monaco: typeof import('monaco-editor') | null,
    secrets: Record<string, string>
  ) => void;
  handleMarkersChanged: (
    editor: monaco.editor.IStandaloneCodeEditor,
    modelUri: monaco.Uri,
    markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
    owner: string
  ) => void;
}

export function useYamlValidation({
  onValidationErrors,
}: UseYamlValidationProps): UseYamlValidationResult {
  const [validationErrors, setValidationErrors] = useState<YamlValidationError[] | null>(null);

  // Function to find the current step in the workflow based on the path
  const findStepFromPath = useCallback((path: Array<string | number>) => {
    if (!path || path.length < 3) {
      return null;
    }

    // Look for 'steps' in the path
    const stepsIdx = path.findIndex((p) => p === 'steps');
    if (stepsIdx === -1) {
      return null;
    }

    // Check if there's an index after 'steps'
    if (stepsIdx + 1 >= path.length || typeof path[stepsIdx + 1] !== 'number') {
      return null;
    }

    return {
      stepIndex: path[stepsIdx + 1] as number,
      isInStep: true,
    };
  }, []);

  const findActionFromPath = useCallback((path: Array<string | number>) => {
    if (!path || path.length < 3) {
      return null;
    }

    // Look for 'actions' in the path
    const actionsIdx = path.findIndex((p) => p === 'actions');
    if (actionsIdx === -1) {
      return null;
    }

    // Check if there's an index after 'actions'
    if (actionsIdx + 1 >= path.length || typeof path[actionsIdx + 1] !== 'number') {
      return null;
    }

    return {
      actionIndex: path[actionsIdx + 1] as number,
      isInAction: true,
    };
  }, []);

  // Function to validate mustache expressions and apply decorations
  const validateMustacheExpressions = useCallback(
    (
      model: monaco.editor.ITextModel | null,
      monaco: typeof import('monaco-editor') | null,
      secrets: Record<string, string> = {}
    ) => {
      if (!model || !monaco) {
        return;
      }

      try {
        const text = model.getValue();
        const yamlDoc = parseDocument(text);
        let workflowDefinition;

        try {
          // Parse the YAML to JSON to get the workflow definition
          workflowDefinition = parseWorkflowYamlToJSON(text);
        } catch (e) {
          console.warn('Unable to parse YAML for mustache validation', e);
        }

        // Collect markers to add to the model
        const markers: monaco.editor.IMarkerData[] = [];

        const matches = [...text.matchAll(MUSTACHE_REGEX)];
        // TODO: check if the variable is inside quouted string or yaml | or > string section
        for (const match of matches) {
          const matchStart = match.index;
          const matchEnd = matchStart + match[0].length; // match[0] is the entire {{...}} expression

          // Get the position (line, column) for the match
          const startPos = model.getPositionAt(matchStart);
          const endPos = model.getPositionAt(matchEnd);

          // Get the current path in the YAML document
          const path = getCurrentPath(yamlDoc, matchStart);

          // Extract step information from the path
          const stepInfo = findStepFromPath(path);
          const actionInfo = findActionFromPath(path);

          const currentStepType = stepInfo?.isInStep ? 'step' : 'action';
          // Extract the content from the mustache expression (remove {{ and }})
          const variableContent = match[1].trim();

          const errorMessage: string | null = null;
          const severity: YamlValidationErrorSeverity = 'warning';

          // TODO: validate mustache variable for YAML step

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
        console.error('Error validating mustache expressions:', error);
      }
    },
    [findStepFromPath, findActionFromPath]
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
    validationErrors,
    validateMustacheExpressions,
    handleMarkersChanged,
  };
}
