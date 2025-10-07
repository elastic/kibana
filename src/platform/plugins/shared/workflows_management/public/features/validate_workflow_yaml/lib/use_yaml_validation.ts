/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getCachedDynamicConnectorTypes } from '../../../../common/schema';
import {
  selectWorkflowDefinition,
  selectYamlLineCounter,
} from '../../../widgets/workflow_yaml_editor/lib/store/selectors';
import type { YamlValidationResult } from '../model/types';
import { MarkerSeverity } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { validateStepNameUniqueness } from './validate_step_name_uniqueness';
import { validateVariables as validateVariablesInternal } from './validate_variables';
import { collectAllVariables } from './collect_all_variables';
import {
  selectWorkflowGraph,
  selectYamlDocument,
} from '../../../widgets/workflow_yaml_editor/lib/store';
import { collectAllConnectorIds } from './collect_all_connector_ids';
import { validateConnectorIds } from './validate_connector_ids';

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Hint,
};

export interface UseYamlValidationResult {
  error: Error | null;
}

export function useYamlValidation(
  editor: monaco.editor.IStandaloneCodeEditor | null
): UseYamlValidationResult {
  const [error, setError] = useState<Error | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const yamlDocument = useSelector(selectYamlDocument);
  const workflowGraph = useSelector(selectWorkflowGraph);
  const workflowDefinition = useSelector(selectWorkflowDefinition);
  const lineCounter = useSelector(selectYamlLineCounter);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (!yamlDocument || !workflowGraph || !workflowDefinition) {
      // console.error(
      //   'Error validating variables',
      //   yamlDocument,
      //   workflowGraph,
      //   workflowDefinition
      // );
      setError(new Error('Error validating variables'));
      return;
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    const markers: monaco.editor.IMarkerData[] = [];

    const variableItems = collectAllVariables(model, yamlDocument, workflowGraph);
    const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
    const dynamicConnectorTypes = getCachedDynamicConnectorTypes();

    const validationResults: YamlValidationResult[] = [
      validateStepNameUniqueness(yamlDocument),
      validateVariablesInternal(variableItems, workflowGraph, workflowDefinition),
      validateConnectorIds(connectorIdItems, dynamicConnectorTypes),
    ].flat();

    for (const validationResult of validationResults) {
      if (validationResult.source === 'variable-validation' && validationResult.severity === null) {
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
      } else if (
        validationResult.source === 'connector-id-validation' &&
        validationResult.severity !== null
      ) {
        markers.push({
          severity: SEVERITY_MAP[validationResult.severity],
          message: validationResult.message,
          startLineNumber: validationResult.startLineNumber,
          startColumn: validationResult.startColumn,
          endLineNumber: validationResult.endLineNumber,
          endColumn: validationResult.endColumn,
          source: 'connector-id-validation',
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
            after: validationResult.afterMessage
              ? {
                  content: validationResult.afterMessage,
                  cursorStops: monaco.editor.InjectedTextCursorStops.None,
                  inlineClassName: `after-text`,
                }
              : null,
          },
        });
      } else if (
        validationResult.source === 'connector-id-validation' &&
        validationResult.severity === null
      ) {
        decorations.push({
          range: new monaco.Range(
            validationResult.startLineNumber,
            validationResult.startColumn,
            validationResult.endLineNumber,
            validationResult.endColumn
          ),
          options: {
            inlineClassName: `template-variable-valid`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            hoverMessage: validationResult.hoverMessage
              ? createMarkdownContent(validationResult.hoverMessage)
              : null,
            after: validationResult.after
              ? {
                  content: validationResult.after,
                  cursorStops: monaco.editor.InjectedTextCursorStops.None,
                  inlineClassName: `after-text`,
                }
              : null,
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
    monaco.editor.setModelMarkers(
      model,
      'connector-id-validation',
      markers.filter((m) => m.source === 'connector-id-validation')
    );
    setError(null);
  }, [editor, lineCounter, workflowDefinition, workflowGraph, yamlDocument]);

  return {
    error,
  };
}

function createMarkdownContent(content: string): monaco.IMarkdownString {
  return {
    value: content,
    isTrusted: true,
    supportHtml: true,
  };
}
