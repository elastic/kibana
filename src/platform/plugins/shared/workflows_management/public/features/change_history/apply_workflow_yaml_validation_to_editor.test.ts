/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import {
  applyWorkflowYamlValidationFromComputed,
  applyWorkflowYamlValidationToEditor,
} from './apply_workflow_yaml_validation_to_editor';
import { performComputation } from '../../entities/workflows/store/workflow_detail/utils/computation';
import {
  clearWorkflowYamlComputationCache,
  getCachedWorkflowYamlComputationAsync,
} from '../validate_workflow_yaml/lib/workflow_yaml_computation_cache';
import { BATCHED_CUSTOM_MARKER_OWNER } from '../validate_workflow_yaml/model/types';

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

  it('applies markers and returns validation results from computed workflow data', () => {
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

    const { validationResults } = applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      true,
      decorationsRef
    );

    expect(validationResults.length).toBeGreaterThan(0);
    expect(monaco.editor.getModelMarkers({ owner: BATCHED_CUSTOM_MARKER_OWNER })).not.toHaveLength(
      0
    );
    expect(decorationsRef.current).not.toBeNull();

    model.dispose();
  });

  it('clears markers when highlight validation is disabled', () => {
    const yaml = 'name: test-workflow\n';
    const computed = performComputation(yaml);
    const model = monaco.editor.createModel(yaml, 'yaml');
    const editor = createMockEditor(model);
    const decorationsRef = { current: null as monaco.editor.IEditorDecorationsCollection | null };

    applyWorkflowYamlValidationFromComputed(editor, yaml, computed, true, decorationsRef);
    const { validationResults } = applyWorkflowYamlValidationFromComputed(
      editor,
      yaml,
      computed,
      false,
      decorationsRef
    );

    expect(validationResults).toEqual([]);
    expect(
      monaco.editor.getModelMarkers({ resource: model.uri, owner: BATCHED_CUSTOM_MARKER_OWNER })
    ).toHaveLength(0);
    expect(decorationsRef.current).toBeNull();

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
      decorationsRef
    );

    expect(validationResults.length).toBeGreaterThanOrEqual(0);

    model.dispose();
  });
});
