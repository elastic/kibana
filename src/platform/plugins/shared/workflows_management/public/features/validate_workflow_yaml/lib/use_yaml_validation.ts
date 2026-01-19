/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { monaco } from '@kbn/monaco';
import { collectAllConnectorIds } from './collect_all_connector_ids';
import { collectAllCustomPropertyItems } from './collect_all_custom_property_items';
import { collectAllVariables } from './collect_all_variables';
import { validateConnectorIds } from './validate_connector_ids';
import { validateCustomProperties } from './validate_custom_properties';
import { validateLiquidTemplate } from './validate_liquid_template';
import { validateStepNameUniqueness } from './validate_step_name_uniqueness';
import { validateVariables as validateVariablesInternal } from './validate_variables';
import { getPropertyHandler } from '../../../../common/schema';
import { selectWorkflowGraph, selectYamlDocument } from '../../../entities/workflows/store';
import {
  selectConnectors,
  selectEditorWorkflowLookup,
  selectIsWorkflowTab,
  selectWorkflowDefinition,
  selectYamlLineCounter,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../hooks/use_kibana';
import { MarkerSeverity } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { CUSTOM_YAML_VALIDATION_MARKER_OWNERS, type YamlValidationResult } from '../model/types';

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Hint,
};

export interface UseYamlValidationResult {
  error: Error | null;
  isLoading: boolean;
}

export function useYamlValidation(
  editor: monaco.editor.IStandaloneCodeEditor | null
): UseYamlValidationResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const yamlDocument = useSelector(selectYamlDocument);
  const workflowLookup = useSelector(selectEditorWorkflowLookup);
  const workflowGraph = useSelector(selectWorkflowGraph);
  const workflowDefinition = useSelector(selectWorkflowDefinition);
  const lineCounter = useSelector(selectYamlLineCounter);
  const isWorkflowTab = useSelector(selectIsWorkflowTab);
  const connectors = useSelector(selectConnectors);
  const { application } = useKibana().services;

  useEffect(() => {
    // eslint-disable-next-line complexity
    async function validateYaml() {
      if (!editor) {
        return;
      }

      const model = editor.getModel();
      if (!model) {
        return;
      }

      if (!isWorkflowTab) {
        // clear decorations and markers
        if (decorationsCollection.current) {
          decorationsCollection.current.clear();
        }
        CUSTOM_YAML_VALIDATION_MARKER_OWNERS.forEach((owner) => {
          monaco.editor.setModelMarkers(model, owner, []);
        });
        setIsLoading(false);
        setError(null);
        return;
      }

      if (!yamlDocument || !workflowGraph || !workflowDefinition) {
        let errorMessage = 'Error validating variables';
        if (!yamlDocument) {
          errorMessage += '. Yaml document is not loaded';
        }
        if (!workflowGraph) {
          errorMessage += '. Workflow graph is not loaded';
        }
        if (!workflowDefinition) {
          errorMessage += '. Workflow definition is not loaded';
        }
        setIsLoading(false);
        setError(new Error(errorMessage));
        return;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      const markers: monaco.editor.IMarkerData[] = [];

      const variableItems = collectAllVariables(model, yamlDocument, workflowGraph);
      const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
      const customPropertyItems =
        workflowLookup && lineCounter
          ? collectAllCustomPropertyItems(
              workflowLookup,
              lineCounter,
              (stepType: string, scope: 'config' | 'input', key: string) =>
                getPropertyHandler(stepType, scope, key)
            )
          : [];
      const dynamicConnectorTypes = connectors?.connectorTypes ?? null;

      // Generate the connectors management URL
      const connectorsManagementUrl = application?.getUrlForApp('management', {
        path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
        absolute: true,
      });

      const validationResults: YamlValidationResult[] = [
        validateStepNameUniqueness(yamlDocument),
        validateVariablesInternal(variableItems, workflowGraph, workflowDefinition),
        validateLiquidTemplate(model.getValue()),
        validateConnectorIds(connectorIdItems, dynamicConnectorTypes, connectorsManagementUrl),
        await validateCustomProperties(customPropertyItems),
      ].flat();

      for (const validationResult of validationResults) {
        if (validationResult.owner === 'variable-validation') {
          if (validationResult.severity !== null) {
            markers.push({
              severity: SEVERITY_MAP[validationResult.severity],
              message: validationResult.message,
              startLineNumber: validationResult.startLineNumber,
              startColumn: validationResult.startColumn,
              endLineNumber: validationResult.endLineNumber,
              endColumn: validationResult.endColumn,
              source: 'variable-validation',
            });
          }
          // handle valid variables
          decorations.push({
            range: new monaco.Range(
              validationResult.startLineNumber,
              validationResult.startColumn,
              validationResult.endLineNumber,
              validationResult.endColumn
            ),
            options: {
              inlineClassName: `template-variable-${validationResult.severity ?? 'valid'}`,
              hoverMessage: validationResult.hoverMessage
                ? createMarkdownContent(validationResult.hoverMessage)
                : null,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          });
        } else if (validationResult.owner === 'liquid-template-validation') {
          markers.push({
            severity: SEVERITY_MAP[validationResult.severity],
            message: validationResult.message,
            startLineNumber: validationResult.startLineNumber,
            startColumn: validationResult.startColumn,
            endLineNumber: validationResult.endLineNumber,
            endColumn: validationResult.endColumn,
            source: 'liquid-template-validation',
          });
          decorations.push({
            range: new monaco.Range(
              validationResult.startLineNumber,
              validationResult.startColumn,
              validationResult.endLineNumber,
              validationResult.endColumn
            ),
            options: {
              inlineClassName: `liquid-template-${validationResult.severity ?? 'valid'}`,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              hoverMessage: validationResult.hoverMessage
                ? createMarkdownContent(validationResult.hoverMessage)
                : null,
            },
          });
        } else if (validationResult.owner === 'step-name-validation') {
          markers.push({
            severity: SEVERITY_MAP[validationResult.severity],
            message: validationResult.message,
            startLineNumber: validationResult.startLineNumber,
            startColumn: validationResult.startColumn,
            endLineNumber: validationResult.endLineNumber,
            endColumn: validationResult.endColumn,
            source: 'step-name-validation',
          });
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
        } else if (validationResult.owner === 'connector-id-validation') {
          if (validationResult.severity !== null) {
            markers.push({
              severity: SEVERITY_MAP[validationResult.severity],
              message: validationResult.message,
              startLineNumber: validationResult.startLineNumber,
              startColumn: validationResult.startColumn,
              endLineNumber: validationResult.endLineNumber,
              endColumn: validationResult.endColumn,
              source: 'connector-id-validation',
            });
          }
          const decorationOptions: monaco.editor.IModelDecorationOptions = {
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            hoverMessage: validationResult.hoverMessage
              ? createMarkdownContent(validationResult.hoverMessage)
              : null,
            before: validationResult.beforeMessage
              ? {
                  content: validationResult.beforeMessage,
                  cursorStops: monaco.editor.InjectedTextCursorStops.None,
                  inlineClassName: `connector-name-badge`,
                }
              : null,
          };
          // Only add inlineClassName for errors, not for valid connectors
          if (validationResult.severity !== null) {
            decorationOptions.inlineClassName = `template-variable-${validationResult.severity}`;
          }
          decorations.push({
            range: new monaco.Range(
              validationResult.startLineNumber,
              validationResult.startColumn,
              validationResult.endLineNumber,
              validationResult.endColumn
            ),
            options: decorationOptions,
          });
        } else {
          if (validationResult.severity !== null) {
            markers.push({
              severity: SEVERITY_MAP[validationResult.severity],
              message: validationResult.message,
              startLineNumber: validationResult.startLineNumber,
              startColumn: validationResult.startColumn,
              endLineNumber: validationResult.endLineNumber,
              endColumn: validationResult.endColumn,
              source: validationResult.owner,
            });
          }
          decorations.push({
            range: new monaco.Range(
              validationResult.startLineNumber,
              validationResult.startColumn,
              validationResult.endLineNumber,
              validationResult.endColumn
            ),
            options: {
              inlineClassName: `${validationResult.owner}-${validationResult.severity ?? 'valid'}`,
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
        }
      }

      if (decorationsCollection.current) {
        decorationsCollection.current.clear();
      }
      decorationsCollection.current = editor.createDecorationsCollection(decorations);

      setIsLoading(false);
      // Set markers on the model for the problems panel
      CUSTOM_YAML_VALIDATION_MARKER_OWNERS.forEach((owner) => {
        monaco.editor.setModelMarkers(
          model,
          owner,
          markers.filter((m) => m.source === owner)
        );
      });
      setError(null);
    }

    validateYaml();
  }, [
    editor,
    lineCounter,
    workflowDefinition,
    workflowGraph,
    yamlDocument,
    application,
    isWorkflowTab,
    connectors?.connectorTypes,
    workflowLookup,
  ]);

  return {
    error,
    isLoading,
  };
}

function createMarkdownContent(content: string): monaco.IMarkdownString {
  return {
    value: content,
    isTrusted: true,
    supportHtml: true,
  };
}
