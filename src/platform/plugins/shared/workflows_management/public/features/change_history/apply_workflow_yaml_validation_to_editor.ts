/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import type { Document } from 'yaml';
import { monaco } from '@kbn/code-editor';
import type { ComputedData } from '../../entities/workflows/store/workflow_detail/types';
import {
  collectFullWorkflowYamlValidationResults,
  type WorkflowYamlValidationContext,
} from '../validate_workflow_yaml/lib/collect_full_workflow_yaml_validation_results';
import { createMarkersAndDecorations } from '../validate_workflow_yaml/lib/create_yaml_validation_markers_and_decorations';
import { getCachedWorkflowYamlComputationAsync } from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';
import {
  BATCHED_CUSTOM_MARKER_OWNER,
  filterHighlightableValidationResults,
  type YamlValidationResult,
} from '../validate_workflow_yaml/model/types';

export interface ApplyWorkflowYamlValidationResult {
  validationResults: YamlValidationResult[];
  yamlDocument: Document | null;
}

const clearEditorValidation = (
  model: monaco.editor.ITextModel,
  decorationsCollectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>
): void => {
  monaco.editor.setModelMarkers(model, BATCHED_CUSTOM_MARKER_OWNER, []);
  decorationsCollectionRef.current?.clear();
  decorationsCollectionRef.current = null;
};

export interface ApplyValidationHighlightsOptions {
  omitMarginDecorations?: boolean;
}

export interface ApplyWorkflowYamlValidationOptions {
  /** When true, only compute custom validation results; caller merges and applies highlights. */
  skipApplyingHighlights?: boolean;
  validationContext: WorkflowYamlValidationContext;
}

export const applyValidationHighlightsToEditor = (
  editor: monaco.editor.IStandaloneCodeEditor,
  validationResults: YamlValidationResult[],
  decorationsCollectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>,
  options?: ApplyValidationHighlightsOptions
): void => {
  const model = editor.getModel();
  if (!model) {
    return;
  }

  const highlightableResults = filterHighlightableValidationResults(validationResults);

  const { markers, decorations } = createMarkersAndDecorations(highlightableResults, {
    omitMarginDecorations: options?.omitMarginDecorations,
    omitMarkersForOwners: ['yaml'],
  });

  monaco.editor.setModelMarkers(model, BATCHED_CUSTOM_MARKER_OWNER, markers);
  decorationsCollectionRef.current?.clear();
  decorationsCollectionRef.current = editor.createDecorationsCollection(decorations);
};

export async function applyWorkflowYamlValidationFromComputed(
  editor: monaco.editor.IStandaloneCodeEditor,
  yamlString: string,
  computed: ComputedData,
  highlightValidationErrors: boolean,
  decorationsCollectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>,
  options: ApplyWorkflowYamlValidationOptions
): Promise<ApplyWorkflowYamlValidationResult> {
  const model = editor.getModel();
  if (!model) {
    return { validationResults: [], yamlDocument: null };
  }

  if (!highlightValidationErrors) {
    clearEditorValidation(model, decorationsCollectionRef);
    return { validationResults: [], yamlDocument: null };
  }

  if (!computed.yamlDocument || !computed.yamlLineCounter) {
    clearEditorValidation(model, decorationsCollectionRef);
    return { validationResults: [], yamlDocument: computed.yamlDocument ?? null };
  }

  const validationResults = await collectFullWorkflowYamlValidationResults({
    yamlString,
    model,
    yamlDocument: computed.yamlDocument,
    lineCounter: computed.yamlLineCounter,
    workflowLookup: computed.workflowLookup,
    workflowGraph: computed.workflowGraph,
    workflowDefinition: computed.workflowDefinition ?? undefined,
    graphBuildError: computed.graphBuildError,
    context: options.validationContext,
  });

  if (!options.skipApplyingHighlights) {
    applyValidationHighlightsToEditor(editor, validationResults, decorationsCollectionRef, {
      omitMarginDecorations: true,
    });
  }

  return {
    validationResults: filterHighlightableValidationResults(validationResults),
    yamlDocument: computed.yamlDocument,
  };
}

export async function applyWorkflowYamlValidationToEditor(
  editor: monaco.editor.IStandaloneCodeEditor,
  yamlString: string,
  highlightValidationErrors: boolean,
  decorationsCollectionRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>,
  signal: AbortSignal | undefined,
  options: ApplyWorkflowYamlValidationOptions
): Promise<ApplyWorkflowYamlValidationResult> {
  const model = editor.getModel();
  if (!model) {
    return { validationResults: [], yamlDocument: null };
  }

  if (!highlightValidationErrors) {
    clearEditorValidation(model, decorationsCollectionRef);
    return { validationResults: [], yamlDocument: null };
  }

  let computed: ComputedData;
  try {
    computed = await getCachedWorkflowYamlComputationAsync(yamlString, signal);
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return { validationResults: [], yamlDocument: null };
    }
    throw error;
  }

  if (signal?.aborted) {
    return { validationResults: [], yamlDocument: null };
  }

  return applyWorkflowYamlValidationFromComputed(
    editor,
    yamlString,
    computed,
    highlightValidationErrors,
    decorationsCollectionRef,
    {
      ...options,
      validationContext: {
        ...options.validationContext,
        signal: options.validationContext.signal ?? signal,
      },
    }
  );
}
