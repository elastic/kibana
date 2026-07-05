/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { monaco } from '@kbn/code-editor';
import { collectAllConnectorIds } from './collect_all_connector_ids';
import { collectAllStepPropertyItems } from './collect_all_step_property_items';
import { createMarkersAndDecorations } from './create_yaml_validation_markers_and_decorations';
import { useGetPropertyHandler } from './property_handlers/use_get_property_handler';
import { runWorkflowYamlValidations } from './run_workflow_yaml_validations';
import { validateConnectorIds } from './validate_connector_ids';
import { validateGraphBuild } from './validate_graph_build';
import { validateStepProperties } from './validate_step_properties';
import { validateWorkflowInputs } from './validate_workflow_inputs';
import { selectWorkflowGraph, selectYamlDocument } from '../../../entities/workflows/store';
import {
  selectConnectors,
  selectEditorWorkflowLookup,
  selectGraphBuildError,
  selectIsWorkflowTab,
  selectWorkflowDefinition,
  selectWorkflows,
  selectYamlLineCounter,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowEsqlCallbacks } from '../../../widgets/workflow_yaml_editor/lib/esql_validation/use_workflow_esql_callbacks';
import { validateEsqlSteps } from '../../../widgets/workflow_yaml_editor/lib/esql_validation/validate_esql_steps';
import {
  BATCHED_CUSTOM_MARKER_OWNER,
  validationResultFingerprint,
  type YamlValidationResult,
} from '../model/types';

function buildResultsFingerprint(results: YamlValidationResult[]): string {
  if (results.length === 0) {
    return '';
  }
  return results.map(validationResultFingerprint).join('\n');
}

export interface UseYamlValidationResult {
  error: Error | null;
  isLoading: boolean;
  /** Custom validation results (source of truth for accordion; avoids interceptor timing issues) */
  validationResults: YamlValidationResult[];
}

export function useYamlValidation(
  editor: monaco.editor.IStandaloneCodeEditor | null
): UseYamlValidationResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [validationResults, setValidationResults] = useState<YamlValidationResult[]>([]);
  const lastFingerprintRef = useRef<string>('');
  const setStableValidationResults = useCallback((results: YamlValidationResult[]) => {
    const fingerprint = buildResultsFingerprint(results);
    if (fingerprint !== lastFingerprintRef.current) {
      lastFingerprintRef.current = fingerprint;
      setValidationResults(results);
    }
  }, []);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const yamlDocument = useSelector(selectYamlDocument);
  const workflowLookup = useSelector(selectEditorWorkflowLookup);
  const workflowGraph = useSelector(selectWorkflowGraph);
  const workflowDefinition = useSelector(selectWorkflowDefinition);
  const graphBuildError = useSelector(selectGraphBuildError);
  const lineCounter = useSelector(selectYamlLineCounter);
  const isWorkflowTab = useSelector(selectIsWorkflowTab);
  const connectors = useSelector(selectConnectors);
  const workflows = useSelector(selectWorkflows);
  const { application, http, data, licensing } = useKibana().services;
  const esqlCallbacks = useWorkflowEsqlCallbacks({
    http,
    application,
    data,
    licensing,
  });
  // Held in a ref so the effect below doesn't re-fire just because the
  // memo identity rebuilt (it does on every render in tests where the kibana
  // mock returns fresh service objects).
  const esqlCallbacksRef = useRef(esqlCallbacks);
  esqlCallbacksRef.current = esqlCallbacks;
  const getPropertyHandler = useGetPropertyHandler();

  useEffect(() => {
    const esqlAbortController = new AbortController();

    async function validateYaml() {
      if (!editor) {
        return;
      }

      const model = editor.getModel();
      if (!model) {
        return;
      }

      if (!isWorkflowTab) {
        if (decorationsCollection.current) {
          decorationsCollection.current.clear();
        }
        monaco.editor.setModelMarkers(model, BATCHED_CUSTOM_MARKER_OWNER, []);
        setStableValidationResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (!yamlDocument) {
        setStableValidationResults([]);
        setIsLoading(false);
        setError(new Error('Error validating: Yaml document is not loaded'));
        return;
      }

      const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
      const stepPropertyItems =
        workflowLookup && lineCounter
          ? collectAllStepPropertyItems(workflowLookup, lineCounter, getPropertyHandler)
          : [];
      const dynamicConnectorTypes = connectors?.connectorTypes ?? null;

      // Generate the connectors management URL
      const connectorsManagementUrl = application.getUrlForApp('management', {
        deepLinkId: 'triggersActionsConnectors',
        absolute: true,
      });

      // These validations only need the parsed YAML document, not the full workflow graph.
      // They must run even when workflowGraph/workflowDefinition are unavailable
      // (e.g. during editing when the YAML doesn't fully match the workflow schema yet)
      // so that connector-id, step-name, liquid-template, step-property, and
      // workflow-inputs validation still provide feedback.
      const yamlString = model.getValue();
      const results: YamlValidationResult[] = lineCounter
        ? runWorkflowYamlValidations({
            yamlString,
            model,
            yamlDocument,
            lineCounter,
            workflowLookup: workflowLookup ?? undefined,
            workflowGraph: workflowGraph ?? undefined,
            workflowDefinition: workflowDefinition ?? undefined,
          })
        : [];

      results.push(
        ...validateConnectorIds(connectorIdItems, dynamicConnectorTypes, connectorsManagementUrl),
        // Surface graph-build failures (valid YAML that compiles to an
        // unsupported graph, e.g. waitForInput inside a parallel branch) as a
        // precise, step-anchored marker instead of the generic fallback error.
        // Editor-only: needs the live graphBuildError from the store.
        ...validateGraphBuild(graphBuildError, workflowLookup, lineCounter)
      );

      if (stepPropertyItems.length > 0) {
        results.push(...(await validateStepProperties(stepPropertyItems)));
      }

      if (workflowLookup && lineCounter) {
        results.push(
          ...validateWorkflowInputs(workflowLookup, workflows, lineCounter),
          ...(await validateEsqlSteps(
            workflowLookup,
            lineCounter,
            model,
            esqlCallbacksRef.current,
            esqlAbortController.signal
          ).catch(() => []))
        );
      }

      const { markers, decorations } = createMarkersAndDecorations(results);

      if (decorationsCollection.current) {
        decorationsCollection.current.clear();
      }
      decorationsCollection.current = editor.createDecorationsCollection(decorations);

      setStableValidationResults(results);
      setIsLoading(false);
      monaco.editor.setModelMarkers(model, BATCHED_CUSTOM_MARKER_OWNER, markers);
      setError(null);
    }

    validateYaml();

    return () => {
      esqlAbortController.abort();
    };
  }, [
    editor,
    lineCounter,
    workflowDefinition,
    workflowGraph,
    graphBuildError,
    yamlDocument,
    application,
    isWorkflowTab,
    connectors?.connectorTypes,
    workflowLookup,
    workflows,
    setStableValidationResults,
    getPropertyHandler,
  ]);

  return {
    error,
    isLoading,
    validationResults,
  };
}
