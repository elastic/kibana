/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './use_workflow_change_history_preview_validation.test_mocks';

import { act, renderHook, type RenderHookResult, waitFor } from '@testing-library/react';
import {
  applyValidationHighlightsToEditor,
  applyWorkflowYamlValidationToEditor,
} from './apply_workflow_yaml_validation_to_editor';
import { collectYamlSchemaValidationResults } from './collect_yaml_schema_validation_results';
import {
  useWorkflowChangeHistoryPreviewValidation,
  type UseWorkflowChangeHistoryPreviewValidationParams,
  type UseWorkflowChangeHistoryPreviewValidationResult,
} from './use_workflow_change_history_preview_validation';
import {
  createPreviewValidationHookParams,
  emitPreviewValidationMarkerChange,
  previewValidationMockEditor,
  resetPreviewValidationHarness,
  samplePreviewCustomError,
  samplePreviewYamlError,
  samplePreviewYamlMarker,
  setPreviewValidationMockModelYaml,
} from './use_workflow_change_history_preview_validation_test_harness';
import { waitForPreviewYamlSchemaMarkers } from './wait_for_yaml_schema_markers_after_update';
import { useAvailableConnectors } from '../../entities/connectors/model/use_available_connectors';
import { navigateToErrorPosition } from '../../widgets/workflow_yaml_editor/lib/utils';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';
import { useWorkflowJsonSchema } from '../validate_workflow_yaml/model/use_workflow_json_schema';

const mockApplyValidation = applyWorkflowYamlValidationToEditor as jest.Mock;
const mockApplyHighlights = applyValidationHighlightsToEditor as jest.Mock;
const mockCollectYamlResults = collectYamlSchemaValidationResults as jest.Mock;
const mockUseWorkflowJsonSchema = useWorkflowJsonSchema as jest.Mock;
const mockUseAvailableConnectors = useAvailableConnectors as jest.Mock;
const mockWaitForPreviewYamlSchemaMarkers = waitForPreviewYamlSchemaMarkers as jest.Mock;

const { monaco: mockMonaco } = jest.requireMock('@kbn/code-editor') as {
  monaco: { editor: { getModelMarkers: jest.Mock } };
};
const mockGetModelMarkers = mockMonaco.editor.getModelMarkers;

const stableWorkflowJsonSchema = { type: 'object' };
const stableConnectorsData = { connectorTypes: {} };

let unmountHook: (() => void) | undefined;

type PreviewValidationHookResult = RenderHookResult<
  UseWorkflowChangeHistoryPreviewValidationResult,
  UseWorkflowChangeHistoryPreviewValidationParams
>;

function mountPreviewValidationHook(
  render: () => UseWorkflowChangeHistoryPreviewValidationResult
): PreviewValidationHookResult;
function mountPreviewValidationHook(
  render: (
    props: UseWorkflowChangeHistoryPreviewValidationParams
  ) => UseWorkflowChangeHistoryPreviewValidationResult,
  options: { initialProps: UseWorkflowChangeHistoryPreviewValidationParams }
): PreviewValidationHookResult;
function mountPreviewValidationHook(
  render: (
    props: UseWorkflowChangeHistoryPreviewValidationParams
  ) => UseWorkflowChangeHistoryPreviewValidationResult,
  options?: { initialProps: UseWorkflowChangeHistoryPreviewValidationParams }
): PreviewValidationHookResult {
  unmountHook?.();
  const rendered = renderHook(render, options);
  unmountHook = rendered.unmount;
  return rendered;
}

const flushMicrotasks = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useWorkflowChangeHistoryPreviewValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPreviewValidationHarness();
    mockGetModelMarkers.mockReturnValue([]);
    mockUseWorkflowJsonSchema.mockReturnValue({
      jsonSchema: stableWorkflowJsonSchema,
      uri: 'file:///workflow-schema.json',
    });
    mockUseAvailableConnectors.mockReturnValue(stableConnectorsData);
    mockApplyValidation.mockResolvedValue({
      validationResults: [samplePreviewCustomError],
      yamlDocument: null,
    });
    mockCollectYamlResults.mockReturnValue([]);
  });

  afterEach(() => {
    unmountHook?.();
    unmountHook = undefined;
    jest.useRealTimers();
  });

  it('clears validation results when highlight is disabled', async () => {
    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    const { result, rerender } = mountPreviewValidationHook(
      (props) => useWorkflowChangeHistoryPreviewValidation(props),
      { initialProps: params }
    );

    await waitFor(() => {
      expect(result.current.validationResults).toHaveLength(1);
    });

    rerender({ ...params, highlightValidationErrors: false });

    expect(result.current.validationResults).toEqual([]);
    expect(mockApplyValidation).toHaveBeenLastCalledWith(
      previewValidationMockEditor,
      'name: test\n',
      false,
      params.validationDecorationsRef,
      undefined,
      expect.objectContaining({
        validationContext: expect.objectContaining({ connectorTypes: {} }),
      })
    );
  });

  it('runs validation once when highlight is enabled and skips inline highlight apply', async () => {
    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });

    const { result } = mountPreviewValidationHook(() =>
      useWorkflowChangeHistoryPreviewValidation(params)
    );

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledTimes(1);
      expect(result.current.isValidationLoading).toBe(false);
    });

    expect(mockApplyValidation).toHaveBeenCalledWith(
      previewValidationMockEditor,
      'name: test\n',
      true,
      params.validationDecorationsRef,
      expect.any(AbortSignal),
      expect.objectContaining({ skipApplyingHighlights: true })
    );

    expect(mockApplyHighlights).toHaveBeenCalledTimes(1);
  });

  it('does not re-run validation when highlight stays enabled and editor remounts', async () => {
    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });

    const { rerender } = mountPreviewValidationHook(
      (props) => useWorkflowChangeHistoryPreviewValidation(props),
      { initialProps: params }
    );

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledTimes(1);
    });

    mockApplyValidation.mockClear();

    rerender({ ...params, isEditorMounted: false });
    rerender({ ...params, isEditorMounted: true });

    await flushMicrotasks();

    expect(mockApplyValidation).not.toHaveBeenCalled();
  });

  it('clears stale validation results and re-runs when validationYaml changes', async () => {
    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    const { result, rerender } = mountPreviewValidationHook(
      (props) => useWorkflowChangeHistoryPreviewValidation(props),
      { initialProps: params }
    );

    await waitFor(() => {
      expect(result.current.validationResults).toHaveLength(1);
    });

    mockApplyValidation.mockClear();
    mockApplyValidation.mockResolvedValue({ validationResults: [], yamlDocument: null });

    setPreviewValidationMockModelYaml('name: valid\n');
    rerender({ ...params, validationYaml: 'name: valid\n' });

    await waitFor(() => {
      expect(result.current.validationResults).toEqual([]);
    });

    expect(mockApplyValidation).toHaveBeenCalledTimes(1);
  });

  it('reuses existing yaml markers without waiting for schema registration on subsequent runs', async () => {
    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    const { rerender } = mountPreviewValidationHook(
      (props) => useWorkflowChangeHistoryPreviewValidation(props),
      { initialProps: params }
    );

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledTimes(1);
    });

    mockApplyValidation.mockClear();
    mockWaitForPreviewYamlSchemaMarkers.mockClear();
    mockGetModelMarkers.mockReturnValue([samplePreviewYamlMarker]);

    setPreviewValidationMockModelYaml('name: valid\n');
    rerender({ ...params, validationYaml: 'name: valid\n' });

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledTimes(1);
    });

    expect(mockWaitForPreviewYamlSchemaMarkers).not.toHaveBeenCalled();
    expect(mockCollectYamlResults).toHaveBeenCalled();
  });

  it('keeps the footer loading until the full validation pipeline completes when markers change mid-run', async () => {
    let resolveValidation!: (value: {
      validationResults: YamlValidationResult[];
      yamlDocument: null;
    }) => void;
    const validationPromise = new Promise<{
      validationResults: YamlValidationResult[];
      yamlDocument: null;
    }>((resolve) => {
      resolveValidation = resolve;
    });
    mockApplyValidation.mockReturnValue(validationPromise);
    mockCollectYamlResults.mockReturnValue([samplePreviewYamlError]);
    mockGetModelMarkers.mockReturnValue([samplePreviewYamlMarker]);

    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    const { result } = mountPreviewValidationHook(() =>
      useWorkflowChangeHistoryPreviewValidation(params)
    );

    await flushMicrotasks();

    act(() => {
      emitPreviewValidationMarkerChange();
    });

    await flushMicrotasks();

    expect(result.current.isValidationLoading).toBe(true);
    expect(result.current.validationResults).toEqual([]);

    await act(async () => {
      resolveValidation({ validationResults: [samplePreviewCustomError], yamlDocument: null });
      await validationPromise;
    });

    await waitFor(() => {
      expect(result.current.validationResults).toHaveLength(2);
      expect(result.current.isValidationLoading).toBe(false);
    });
  });

  it('keeps the footer in a loading state when switching versions until validation completes', async () => {
    mockCollectYamlResults.mockReturnValue([samplePreviewYamlError]);

    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    const { result, rerender } = mountPreviewValidationHook(
      (props) => useWorkflowChangeHistoryPreviewValidation(props),
      { initialProps: params }
    );

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledTimes(1);
    });

    mockApplyValidation.mockClear();
    mockApplyValidation.mockReturnValue(new Promise(() => undefined));
    mockWaitForPreviewYamlSchemaMarkers.mockClear();
    mockGetModelMarkers.mockReturnValue([samplePreviewYamlMarker]);

    setPreviewValidationMockModelYaml('name: invalid\n');
    rerender({ ...params, validationYaml: 'name: invalid\n' });

    await waitFor(() => {
      expect(result.current.isValidationLoading).toBe(true);
      expect(result.current.validationResults).toEqual([]);
    });

    expect(mockWaitForPreviewYamlSchemaMarkers).not.toHaveBeenCalled();
  });

  it('ignores marker changes that only affect custom highlight markers', async () => {
    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    mountPreviewValidationHook(() => useWorkflowChangeHistoryPreviewValidation(params));

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalled();
    });

    mockCollectYamlResults.mockClear();
    mockGetModelMarkers.mockReturnValue([]);

    act(() => {
      emitPreviewValidationMarkerChange();
    });

    expect(mockCollectYamlResults).not.toHaveBeenCalled();
  });

  it('navigates to the validation error position when a row is clicked', () => {
    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    const { result } = mountPreviewValidationHook(() =>
      useWorkflowChangeHistoryPreviewValidation(params)
    );

    result.current.handleValidationErrorClick(samplePreviewCustomError);

    expect(navigateToErrorPosition).toHaveBeenCalledWith(previewValidationMockEditor, 2, 1);
  });

  it('re-runs validation when the workflow json schema loads after highlight is enabled', async () => {
    let schemaLoaded = false;
    mockUseWorkflowJsonSchema.mockImplementation(() => ({
      jsonSchema: schemaLoaded ? stableWorkflowJsonSchema : null,
      uri: schemaLoaded ? 'file:///workflow-schema.json' : undefined,
    }));

    const params = createPreviewValidationHookParams({ highlightValidationErrors: true });
    const { result, rerender } = mountPreviewValidationHook(
      (props) => useWorkflowChangeHistoryPreviewValidation(props),
      { initialProps: params }
    );

    await waitFor(() => {
      expect(result.current.validationResults).toHaveLength(1);
    });

    mockApplyValidation.mockClear();
    mockCollectYamlResults.mockReturnValue([samplePreviewYamlError]);

    schemaLoaded = true;
    rerender({ ...params, highlightValidationErrors: true });

    await waitFor(() => {
      expect(mockApplyValidation).toHaveBeenCalledTimes(1);
      expect(result.current.validationResults).toHaveLength(2);
    });
  });
});
