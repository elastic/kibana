/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import { BATCHED_CUSTOM_MARKER_OWNER, type YamlValidationResult } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import {
  attachStepFragmentYamlSupport,
  type StepFragmentYamlSupportEditor,
  type StepFragmentYamlSupportInputs,
} from './attach_step_fragment_yaml_support';
import { createMockWorkflowContextRegistry } from '../../../../common/lib/create_workflow_context_registry.mock';
import {
  isStepFragmentModel,
  resolveStepFragmentTarget,
} from '../../../widgets/workflow_yaml_editor/lib/step_fragment/step_fragment_models';
import type { WorkflowYamlValidationContext } from '../../validate_workflow_yaml/lib/collect_full_workflow_yaml_validation_results';

const mockCollectFullWorkflowYamlValidationResults = jest.fn().mockResolvedValue([]);
jest.mock('../../validate_workflow_yaml/lib/collect_full_workflow_yaml_validation_results', () => ({
  collectFullWorkflowYamlValidationResults: (...args: unknown[]) =>
    mockCollectFullWorkflowYamlValidationResults(...args),
}));

const BASE_YAML = `name: demo
triggers:
  - type: manual
steps:
  - name: first
    type: console
    with:
      message: hello
  - name: second
    type: http
    with:
      url: https://example.com
`;

const makeResult = (overrides: Partial<YamlValidationResult>): YamlValidationResult =>
  ({
    id: 'r',
    owner: 'step-property-validation',
    ruleId: null,
    severity: 'error',
    message: 'bad',
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 1,
    hoverMessage: null,
    ...overrides,
  } as unknown as YamlValidationResult);

/** A fake `IStandaloneCodeEditor` exposing just `getModel`/`setModel`/`onDidDispose`. */
const createFakeEditor = (
  initialModel: monaco.editor.ITextModel
): StepFragmentYamlSupportEditor & {
  triggerDispose: () => void;
} => {
  let currentModel: monaco.editor.ITextModel | null = initialModel;
  const listeners = new Set<() => void>();
  return {
    getModel: () => currentModel,
    setModel: ((model: monaco.editor.ITextModel | null) => {
      currentModel = model;
    }) as StepFragmentYamlSupportEditor['setModel'],
    onDidDispose: ((listener: () => void) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    }) as StepFragmentYamlSupportEditor['onDidDispose'],
    triggerDispose: () => listeners.forEach((listener) => listener()),
  };
};

describe('attachStepFragmentYamlSupport', () => {
  let inputs: StepFragmentYamlSupportInputs;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCollectFullWorkflowYamlValidationResults.mockReset().mockResolvedValue([]);
    inputs = {
      workflowYaml: BASE_YAML,
      stepName: 'first',
      workflowZodSchema: z.object({}),
      validationContext: {
        registry: createMockWorkflowContextRegistry(),
        connectorTypes: { status: 'ready', value: {} },
        connectorsManagementUrl: 'http://test/connectors',
        workflows: { workflows: {}, totalWorkflows: 0 },
        getPropertyHandler: () => null,
        esqlCallbacks: {} as WorkflowYamlValidationContext['esqlCallbacks'],
        isManaged: false,
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('swaps the editor model to a step-fragment model and disposes the original', () => {
    const originalModel = monaco.editor.createModel('name: first\ntype: console\n', YAML_LANG_ID);
    const editor = createFakeEditor(originalModel);

    const handle = attachStepFragmentYamlSupport(editor, () => inputs);

    const fragmentModel = editor.getModel();
    expect(fragmentModel).not.toBe(originalModel);
    expect(fragmentModel).not.toBeNull();
    expect(isStepFragmentModel(fragmentModel!)).toBe(true);
    expect(originalModel.isDisposed()).toBe(true);

    handle.dispose();
  });

  it('resolves the shadow target with the fragment spliced back into the full workflow YAML', () => {
    const originalModel = monaco.editor.createModel(
      'name: first\ntype: console\nwith:\n  message: hi\n',
      YAML_LANG_ID
    );
    const editor = createFakeEditor(originalModel);
    const handle = attachStepFragmentYamlSupport(editor, () => inputs);

    const fragmentModel = editor.getModel()!;
    const target = resolveStepFragmentTarget(fragmentModel);
    expect(target).toBeDefined();
    expect(target?.computed.workflowDefinition?.steps?.[0]).toMatchObject({
      name: 'first',
      type: 'console',
      with: { message: 'hi' },
    });
    expect(target?.computed.workflowDefinition?.steps?.[1]).toMatchObject({ name: 'second' });

    handle.dispose();
  });

  it('publishes a validation result inside the step, mapped to fragment coordinates', async () => {
    const originalModel = monaco.editor.createModel('name: first\ntype: console\n', YAML_LANG_ID);
    const editor = createFakeEditor(originalModel);
    const handle = attachStepFragmentYamlSupport(editor, () => inputs);
    const fragmentModel = editor.getModel()!;

    const target = resolveStepFragmentTarget(fragmentModel);
    expect(target).toBeDefined();
    // Line 1 of the virtual document ('name: first', at the step's own start line).
    mockCollectFullWorkflowYamlValidationResults.mockResolvedValue([
      makeResult({
        startLineNumber: target!.virtual.startLineNumber,
        startColumn: target!.virtual.columnOffset + 1,
        endLineNumber: target!.virtual.startLineNumber,
        endColumn: target!.virtual.columnOffset + 5,
      }),
    ]);

    handle.revalidate();
    await jest.advanceTimersByTimeAsync(300);

    const markers = monaco.editor.getModelMarkers({
      resource: fragmentModel.uri,
      owner: BATCHED_CUSTOM_MARKER_OWNER,
    });
    expect(markers).toEqual([
      expect.objectContaining({ startLineNumber: 1, startColumn: 1, endColumn: 5 }),
    ]);

    handle.dispose();
  });

  it('drops a validation result outside the step', async () => {
    const originalModel = monaco.editor.createModel('name: first\ntype: console\n', YAML_LANG_ID);
    const editor = createFakeEditor(originalModel);
    const handle = attachStepFragmentYamlSupport(editor, () => inputs);
    const fragmentModel = editor.getModel()!;

    mockCollectFullWorkflowYamlValidationResults.mockResolvedValue([
      makeResult({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 }), // `name: demo` — outside the step
    ]);

    handle.revalidate();
    await jest.advanceTimersByTimeAsync(300);

    const markers = monaco.editor.getModelMarkers({
      resource: fragmentModel.uri,
      owner: BATCHED_CUSTOM_MARKER_OWNER,
    });
    expect(markers).toEqual([]);

    handle.dispose();
  });

  it('clears markers and the resolved target when the step cannot be located', async () => {
    const originalModel = monaco.editor.createModel('name: first\ntype: console\n', YAML_LANG_ID);
    const editor = createFakeEditor(originalModel);
    const handle = attachStepFragmentYamlSupport(editor, () => inputs);
    const fragmentModel = editor.getModel()!;

    mockCollectFullWorkflowYamlValidationResults.mockResolvedValue([
      makeResult({ startLineNumber: 5, startColumn: 1, endLineNumber: 5, endColumn: 5 }),
    ]);
    handle.revalidate();
    await jest.advanceTimersByTimeAsync(300);
    expect(
      monaco.editor.getModelMarkers({
        resource: fragmentModel.uri,
        owner: BATCHED_CUSTOM_MARKER_OWNER,
      })
    ).not.toEqual([]);

    inputs = { ...inputs, stepName: 'missing-step' };
    handle.revalidate();
    await jest.advanceTimersByTimeAsync(300);

    expect(resolveStepFragmentTarget(fragmentModel)).toBeUndefined();
    expect(
      monaco.editor.getModelMarkers({
        resource: fragmentModel.uri,
        owner: BATCHED_CUSTOM_MARKER_OWNER,
      })
    ).toEqual([]);

    handle.dispose();
  });

  it('unregisters the fragment model and disposes the shadow model on dispose', () => {
    const originalModel = monaco.editor.createModel('name: first\ntype: console\n', YAML_LANG_ID);
    const editor = createFakeEditor(originalModel);
    const handle = attachStepFragmentYamlSupport(editor, () => inputs);
    const fragmentModel = editor.getModel()!;

    const targetBeforeDispose = resolveStepFragmentTarget(fragmentModel);
    expect(targetBeforeDispose).toBeDefined();

    handle.dispose();

    expect(resolveStepFragmentTarget(fragmentModel)).toBeUndefined();
    expect(targetBeforeDispose!.model.isDisposed()).toBe(true);
  });

  it('disposes via the editor-level onDidDispose event, cleaning up the shadow model', () => {
    const originalModel = monaco.editor.createModel('name: first\ntype: console\n', YAML_LANG_ID);
    const editor = createFakeEditor(originalModel);
    attachStepFragmentYamlSupport(editor, () => inputs);
    const fragmentModel = editor.getModel()!;
    const target = resolveStepFragmentTarget(fragmentModel);

    editor.triggerDispose();

    expect(resolveStepFragmentTarget(fragmentModel)).toBeUndefined();
    expect(target!.model.isDisposed()).toBe(true);
  });
});
