/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { monaco } from '@kbn/code-editor';
import type { ComputedData } from '../../entities/workflows/store/workflow_detail/types';
import { createMarkersAndDecorations } from '../validate_workflow_yaml/lib/create_yaml_validation_markers_and_decorations';
import { runWorkflowYamlValidations } from '../validate_workflow_yaml/lib/run_workflow_yaml_validations';
import { getCachedWorkflowYamlComputationAsync } from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';
import {
  BATCHED_CUSTOM_MARKER_OWNER,
  type YamlValidationResult,
} from '../validate_workflow_yaml/model/types';

export interface ApplyWorkflowYamlValidationResult {
  validationResults: YamlValidationResult[];
}

const clearEditorValidation = (
  model: monaco.editor.ITextModel,
  decorationsCollectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>
): void => {
  monaco.editor.setModelMarkers(model, BATCHED_CUSTOM_MARKER_OWNER, []);
  decorationsCollectionRef.current?.clear();
  decorationsCollectionRef.current = null;
};

export const applyWorkflowYamlValidationFromComputed = (
  editor: monaco.editor.IStandaloneCodeEditor,
  yamlString: string,
  computed: ComputedData,
  highlightValidationErrors: boolean,
  decorationsCollectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>
): ApplyWorkflowYamlValidationResult => {
  const model = editor.getModel();
  if (!model) {
    return { validationResults: [] };
  }

  if (!highlightValidationErrors) {
    clearEditorValidation(model, decorationsCollectionRef);
    return { validationResults: [] };
  }

  if (!computed.yamlDocument || !computed.yamlLineCounter) {
    clearEditorValidation(model, decorationsCollectionRef);
    return { validationResults: [] };
  }

  const validationResults = runWorkflowYamlValidations({
    yamlString,
    model,
    yamlDocument: computed.yamlDocument,
    lineCounter: computed.yamlLineCounter,
    workflowLookup: computed.workflowLookup,
    workflowGraph: computed.workflowGraph,
    workflowDefinition: computed.workflowDefinition ?? undefined,
  });

  const { markers, decorations } = createMarkersAndDecorations(validationResults);
  monaco.editor.setModelMarkers(model, BATCHED_CUSTOM_MARKER_OWNER, markers);
  decorationsCollectionRef.current?.clear();
  decorationsCollectionRef.current = editor.createDecorationsCollection(decorations);

  return {
    validationResults: validationResults.filter(
      (result) => result.severity === 'error' || result.severity === 'warning'
    ),
  };
};

export const applyWorkflowYamlValidationToEditor = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  yamlString: string,
  highlightValidationErrors: boolean,
  decorationsCollectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>,
  signal?: AbortSignal
): Promise<ApplyWorkflowYamlValidationResult> => {
  const model = editor.getModel();
  if (!model) {
    return { validationResults: [] };
  }

  if (!highlightValidationErrors) {
    clearEditorValidation(model, decorationsCollectionRef);
    return { validationResults: [] };
  }

  const computed = await getCachedWorkflowYamlComputationAsync(yamlString, signal);

  if (signal?.aborted) {
    return { validationResults: [] };
  }

  return applyWorkflowYamlValidationFromComputed(
    editor,
    yamlString,
    computed,
    highlightValidationErrors,
    decorationsCollectionRef
  );
};
