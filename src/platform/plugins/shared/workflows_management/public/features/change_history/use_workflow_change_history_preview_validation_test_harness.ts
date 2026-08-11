/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import type { monaco } from '@kbn/code-editor';
import type { UseWorkflowChangeHistoryPreviewValidationParams } from './use_workflow_change_history_preview_validation';
import type { WorkflowChangeHistoryCompareMode } from './workflow_change_history_preview_settings_popover';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

export const PREVIEW_VALIDATION_TEST_MODEL_URI = 'inmemory://model/test.yaml';

export let previewValidationMarkerChangeListener: ((uris: monaco.Uri[]) => void) | undefined;
export let previewValidationMockModelYaml = 'name: test\n';

export const setPreviewValidationMarkerChangeListener = (
  listener: ((uris: monaco.Uri[]) => void) | undefined
): void => {
  previewValidationMarkerChangeListener = listener;
};

export const setPreviewValidationMockModelYaml = (yaml: string): void => {
  previewValidationMockModelYaml = yaml;
};

export const previewValidationMockEditor = {
  getModel: jest.fn(() => ({
    getValue: () => previewValidationMockModelYaml,
    uri: { toString: () => PREVIEW_VALIDATION_TEST_MODEL_URI },
  })),
  updateOptions: jest.fn(),
} as unknown as monaco.editor.IStandaloneCodeEditor;

export const previewValidationMockDiffEditor = {
  updateOptions: jest.fn(),
  getModifiedEditor: jest.fn(() => previewValidationMockEditor),
} as unknown as monaco.editor.IStandaloneDiffEditor;

export const samplePreviewCustomError: YamlValidationResult = {
  id: 'custom-error',
  owner: 'step-name-validation',
  severity: 'error',
  message: 'Duplicate step name',
  startLineNumber: 2,
  startColumn: 1,
  endLineNumber: 2,
  endColumn: 10,
  hoverMessage: null,
  afterMessage: null,
};

export const samplePreviewYamlError: YamlValidationResult = {
  id: 'yaml-error',
  owner: 'yaml',
  severity: 'error',
  message: 'Missing property "steps".',
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 5,
  hoverMessage: null,
  afterMessage: null,
};

export const samplePreviewYamlMarker = {
  resource: { toString: () => PREVIEW_VALIDATION_TEST_MODEL_URI },
  owner: 'yaml',
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 5,
  severity: 8,
  message: 'Missing property "steps".',
} as monaco.editor.IMarker;

export const createPreviewValidationHookParams = (
  overrides: Partial<UseWorkflowChangeHistoryPreviewValidationParams> = {}
): UseWorkflowChangeHistoryPreviewValidationParams => {
  const editorRef = {
    current: previewValidationMockEditor,
  } as MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  const diffEditorRef = {
    current: previewValidationMockDiffEditor,
  } as MutableRefObject<monaco.editor.IStandaloneDiffEditor | null>;
  const compareModeRef = { current: 'unified' as WorkflowChangeHistoryCompareMode };
  const validationDecorationsRef = {
    current: null,
  } as MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>;

  return {
    getActiveEditor: () => previewValidationMockEditor,
    validationDecorationsRef,
    validationYaml: 'name: test\n',
    highlightValidationErrors: false,
    isEditorMounted: true,
    editorRef,
    diffEditorRef,
    compareModeRef,
    configureDiffEditors: jest.fn(),
    ...overrides,
  };
};

export const resetPreviewValidationHarness = (): void => {
  setPreviewValidationMarkerChangeListener(undefined);
  previewValidationMockModelYaml = 'name: test\n';
};

export const emitPreviewValidationMarkerChange = (): void => {
  previewValidationMarkerChangeListener?.([
    { toString: () => PREVIEW_VALIDATION_TEST_MODEL_URI } as monaco.Uri,
  ]);
};
