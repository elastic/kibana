/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import { useFixWithAi } from './use_fix_with_ai';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';
import type { FixWithAiTarget } from '../../lib/register_fix_with_ai_code_action_provider';
import { registerFixWithAiCodeActionProvider } from '../../lib/register_fix_with_ai_code_action_provider';
import { navigateToErrorPosition } from '../../lib/utils';

jest.mock('../../lib/register_fix_with_ai_code_action_provider', () => ({
  registerFixWithAiCodeActionProvider: jest.fn(),
}));
jest.mock('../../lib/utils', () => ({
  navigateToErrorPosition: jest.fn(),
}));

const registerProviderMock = registerFixWithAiCodeActionProvider as jest.MockedFunction<
  typeof registerFixWithAiCodeActionProvider
>;
const navigateMock = navigateToErrorPosition as jest.MockedFunction<typeof navigateToErrorPosition>;

const validationError = {
  startLineNumber: 15,
  startColumn: 17,
  message: 'Variable inputs.mesage is invalid',
  severity: 'error',
} as YamlValidationResult;

describe('useFixWithAi', () => {
  const model = { uri: { toString: () => 'inmemory://workflow.yaml' } };
  const editor = { getModel: () => model } as unknown as monaco.editor.IStandaloneCodeEditor;
  let dispose: jest.Mock;
  let openAgentChat: jest.Mock;

  const render = (
    overrides: { isAgentBuilderAvailable?: boolean; isReadOnlyYaml?: boolean } = {}
  ) =>
    renderHook((props: Parameters<typeof useFixWithAi>[0]) => useFixWithAi(props), {
      initialProps: {
        editorRef: { current: editor },
        isAgentBuilderAvailable: true,
        isReadOnlyYaml: false,
        openAgentChat,
        ...overrides,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    dispose = jest.fn();
    openAgentChat = jest.fn();
    registerProviderMock.mockReturnValue({ dispose });
  });

  it('opens the chat with a prefilled prompt naming the error and its position', () => {
    const { result } = render();

    result.current.onFixWithAi?.(validationError);

    expect(navigateMock).toHaveBeenCalledWith(editor, 15, 17);
    const { initialMessage, autoSendInitialMessage, newConversation } =
      openAgentChat.mock.calls[0][0];
    expect(initialMessage).toContain('For the attached workflow');
    expect(initialMessage).toContain('validation error on line 15, column 17');
    expect(initialMessage).toContain('Variable inputs.mesage is invalid');
    expect(initialMessage).toContain('give a concise explanation');
    expect(autoSendInitialMessage).toBe(false);
    expect(newConversation).toBe(true);
  });

  it('names the severity of a warning in the prompt', () => {
    const { result } = render();

    result.current.onFixWithAi?.({
      ...validationError,
      severity: 'warning',
    } as YamlValidationResult);

    expect(openAgentChat.mock.calls[0][0].initialMessage).toContain('validation warning on line');
  });

  it('offers the quick fix for the editor model only', () => {
    render();

    const { isEditorModel } = registerProviderMock.mock.calls[0][0];
    const asModel = (uri: string) => ({ uri: { toString: () => uri } } as monaco.editor.ITextModel);

    expect(isEditorModel(asModel('inmemory://workflow.yaml'))).toBe(true);
    expect(isEditorModel(asModel('inmemory://preview.yaml'))).toBe(false);
  });

  it('registers the code action provider and disposes it on unmount', () => {
    const { unmount } = render();

    expect(registerProviderMock).toHaveBeenCalledTimes(1);
    unmount();
    expect(dispose).toHaveBeenCalled();
  });

  it('runs the latest handler through the registered getter', () => {
    render();

    const { getFixWithAi } = registerProviderMock.mock.calls[0][0];
    const target: FixWithAiTarget = {
      startLineNumber: 3,
      startColumn: 5,
      message: 'Boom',
      severity: 'error',
    };
    getFixWithAi()(target);

    expect(navigateMock).toHaveBeenCalledWith(editor, 3, 5);
    expect(openAgentChat).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the agent builder is unavailable', () => {
    const { result } = render({ isAgentBuilderAvailable: false });

    expect(result.current.onFixWithAi).toBeUndefined();
    expect(registerProviderMock).not.toHaveBeenCalled();
  });

  it('is disabled when the YAML is read-only', () => {
    const { result } = render({ isReadOnlyYaml: true });

    expect(result.current.onFixWithAi).toBeUndefined();
    expect(registerProviderMock).not.toHaveBeenCalled();
  });
});
