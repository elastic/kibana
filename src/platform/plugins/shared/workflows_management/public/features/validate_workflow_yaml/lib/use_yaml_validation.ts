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
import { collectFullWorkflowYamlValidationResults } from './collect_full_workflow_yaml_validation_results';
import { createMarkersAndDecorations } from './create_yaml_validation_markers_and_decorations';
import { useWorkflowYamlValidationContext } from './use_workflow_yaml_validation_context';
import { selectWorkflowGraph, selectYamlDocument } from '../../../entities/workflows/store';
import {
  selectEditorWorkflowLookup,
  selectGraphBuildError,
  selectIsWorkflowTab,
  selectWorkflowDefinition,
  selectYamlLineCounter,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  BATCHED_CUSTOM_MARKER_OWNER,
  validationResultsFingerprint,
  type YamlValidationResult,
} from '../model/types';

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
    const fingerprint = validationResultsFingerprint(results);
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
  const validationContext = useWorkflowYamlValidationContext();

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

      if (!yamlDocument || !lineCounter) {
        setStableValidationResults([]);
        setIsLoading(false);
        setError(yamlDocument ? null : new Error('Error validating: Yaml document is not loaded'));
        return;
      }

      const yamlString = model.getValue();
      const results = await collectFullWorkflowYamlValidationResults({
        yamlString,
        model,
        yamlDocument,
        lineCounter,
        workflowLookup: workflowLookup ?? undefined,
        workflowGraph: workflowGraph ?? undefined,
        workflowDefinition: workflowDefinition ?? undefined,
        graphBuildError,
        context: {
          ...validationContext,
          signal: esqlAbortController.signal,
        },
      });

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
    isWorkflowTab,
    workflowLookup,
    validationContext,
    setStableValidationResults,
  ]);

  return {
    error,
    isLoading,
    validationResults,
  };
}
