/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';

jest.mock('../../widgets/workflow_yaml_editor/lib/esql_validation/validate_esql_steps', () => ({
  validateEsqlSteps: jest.fn().mockResolvedValue([]),
}));

import {
  applyValidationHighlightsToEditor,
  applyWorkflowYamlValidationFromComputed,
  applyWorkflowYamlValidationToEditor,
} from './apply_workflow_yaml_validation_to_editor';
import { performComputation } from '../../entities/workflows/store/workflow_detail/utils/computation';
import type { WorkflowYamlValidationContext } from '../validate_workflow_yaml/lib/collect_full_workflow_yaml_validation_results';
import * as createMarkersAndDecorationsModule from '../validate_workflow_yaml/lib/create_yaml_validation_markers_and_decorations';
import {
  clearWorkflowYamlComputationCache,
  getCachedWorkflowYamlComputationAsync,
} from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';
import { BATCHED_CUSTOM_MARKER_OWNER } from '../validate_workflow_yaml/model/types';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

const testValidationContext: WorkflowYamlValidationContext = {
  connectorTypes: {},
  connectorsManagementUrl: 'http://test/connectors',
  workflows: { workflows: {}, totalWorkflows: 0 },
  getPropertyHandler: () => null,
  esqlCallbacks: {},
};

const createMockEditor = (model: monaco.editor.ITextModel): monaco.editor.IStandaloneCodeEditor => {
  const decorationsCollection = {
    clear: jest.fn(),
  };

  return {
    getModel: () => model,
    createDecorationsCollection: jest.fn(() => decorationsCollection),
  } as unknown as monaco.editor.IStandaloneCodeEditor;
};

describe('applyWorkflowYamlValidationToEditor', () => {
  afterEach(() => {
    clearWorkflowYamlComputationCache();
  });

  it('applies markers and returns validation results from computed workflow data', async () => {
    const yaml = [
      'name: test-workflow',
      'steps:',
      '  - name: hello_world_step',
      '    type: console',
      '    with:',
      '      message: "{{ input.message }}"',
    ].join('\n');

    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };

    const { validationResults } = await applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      true,
      decorationsRef,
      { validationContext: testValidationContext }
    );

    expect(validationResults.length).toBeGreaterThan(0);
    expect(monaco.editor.getModelMarkers({ owner: BATCHED_CUSTOM_MARKER_OWNER })).not.toHaveLength(
      0
    );
    expect(decorationsRef.current).not.toBeNull();

    model.dispose();
  });

  it('clears markers when highlight validation is disabled', async () => {
    const yaml = 'name: test-workflow\n';
    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };

    await applyWorkflowYamlValidationFromComputed(editor, yaml, computed, true, decorationsRef, {
      validationContext: testValidationContext,
    });
    const { validationResults } = await applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      false,
      decorationsRef,
      { validationContext: testValidationContext }
    );

    expect(validationResults).toEqual([]);
    expect(
      monaco.editor.getModelMarkers({ resource: model.uri, owner: BATCHED_CUSTOM_MARKER_OWNER })
    ).toHaveLength(0);
    expect(decorationsRef.current).toBeNull();

    model.dispose();
  });

  it('returns validation errors for duplicate step names', async () => {
    const yaml = [
      'name: test-workflow',
      'steps:',
      '  - name: duplicate_step',
      '    type: console',
      '    with:',
      '      message: first',
      '  - name: duplicate_step',
      '    type: console',
      '    with:',
      '      message: second',
    ].join('\n');

    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };

    const { validationResults } = await applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      true,
      decorationsRef,
      { validationContext: testValidationContext }
    );

    expect(validationResults.some((result) => result.message?.includes('duplicate_step'))).toBe(
      true
    );

    model.dispose();
  });

  it('schedules computation off the synchronous call path', async () => {
    const yaml = 'name: async-validation\nsteps:\n  - name: step\n    type: console\n';
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };

    const computationPromise = getCachedWorkflowYamlComputationAsync(yaml);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(computationPromise).resolves.toMatchObject({
      yamlDocument: expect.anything(),
      yamlLineCounter: expect.anything(),
    });

    const { validationResults } = await applyWorkflowYamlValidationToEditor(
      editor,
      yaml,
      true,
      decorationsRef,
      undefined,
      { validationContext: testValidationContext }
    );

    expect(validationResults.length).toBeGreaterThanOrEqual(0);

    model.dispose();
  });

  it('applies merged validation highlights without margin decorations in preview mode', async () => {
    const yaml = [
      'name: test-workflow',
      'steps:',
      '  - name: duplicate_step',
      '    type: console',
      '  - name: duplicate_step',
      '    type: console',
    ].join('\n');

    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };

    const { validationResults } = await applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      true,
      decorationsRef,
      { validationContext: testValidationContext }
    );

    expect(validationResults.length).toBeGreaterThan(0);
    expect(decorationsRef.current).not.toBeNull();
    expect(
      (editor.createDecorationsCollection as jest.Mock).mock.calls[0][0].every(
        (decoration: { options: { marginClassName?: string } }) =>
          decoration.options.marginClassName === undefined
      )
    ).toBe(true);

    model.dispose();
  });

  it('applies merged highlights in a single markers-and-decorations pass', async () => {
    const yaml = [
      'name: test-workflow',
      'steps:',
      '  - name: duplicate_step',
      '    type: console',
      '  - name: duplicate_step',
      '    type: console',
    ].join('\n');

    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };
    const createSpy = jest.spyOn(createMarkersAndDecorationsModule, 'createMarkersAndDecorations');

    const { validationResults } = await applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      true,
      decorationsRef,
      { skipApplyingHighlights: true, validationContext: testValidationContext }
    );

    const yamlSchemaResult: YamlValidationResult = {
      id: 'yaml-error',
      owner: 'yaml',
      severity: 'error',
      message: 'Schema error',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 5,
      hoverMessage: null,
      afterMessage: null,
    };

    createSpy.mockClear();

    applyValidationHighlightsToEditor(
      editor,
      [...validationResults, yamlSchemaResult],
      decorationsRef,
      { omitMarginDecorations: true }
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ owner: 'step-name-validation' }),
        expect.objectContaining({ owner: 'yaml' }),
      ]),
      expect.objectContaining({ omitMarginDecorations: true, omitMarkersForOwners: ['yaml'] })
    );

    createSpy.mockRestore();
    model.dispose();
  });

  it('skips applying highlights when skipApplyingHighlights is set', async () => {
    const yaml = [
      'name: test-workflow',
      'steps:',
      '  - name: duplicate_step',
      '    type: console',
      '  - name: duplicate_step',
      '    type: console',
    ].join('\n');

    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };

    const { validationResults } = await applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      true,
      decorationsRef,
      { skipApplyingHighlights: true, validationContext: testValidationContext }
    );

    expect(validationResults.length).toBeGreaterThan(0);
    expect(editor.createDecorationsCollection).not.toHaveBeenCalled();
    expect(decorationsRef.current).toBeNull();
    expect(
      monaco.editor.getModelMarkers({ resource: model.uri, owner: BATCHED_CUSTOM_MARKER_OWNER })
    ).toHaveLength(0);

    model.dispose();
  });

  it('returns empty validation results when validation is aborted', async () => {
    const yaml = 'name: aborted-validation\nsteps:\n  - name: step\n    type: console\n';
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };
    const controller = new AbortController();
    controller.abort();

    const result = await applyWorkflowYamlValidationToEditor(
      editor,
      yaml,
      true,
      decorationsRef,
      controller.signal,
      { validationContext: testValidationContext }
    );

    expect(result).toEqual({ validationResults: [], yamlDocument: null });

    model.dispose();
  });
});
