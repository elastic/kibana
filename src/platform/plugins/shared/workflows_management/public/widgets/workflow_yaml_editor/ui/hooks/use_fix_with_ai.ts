/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { monaco } from '@kbn/code-editor';
import type { OpenAgentChatOptions } from './use_agent_builder_integration';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';
import type { FixWithAiTarget } from '../../lib/register_fix_with_ai_code_action_provider';
import { registerFixWithAiCodeActionProvider } from '../../lib/register_fix_with_ai_code_action_provider';
import { navigateToErrorPosition } from '../../lib/utils';

interface UseFixWithAiParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  isAgentBuilderAvailable: boolean;
  isReadOnlyYaml: boolean;
  openAgentChat: (options?: OpenAgentChatOptions) => void;
}

interface UseFixWithAiReturn {
  /** Undefined while the agent cannot edit this workflow, so callers can hide their action. */
  onFixWithAi: ((error: YamlValidationResult) => void) | undefined;
}

// Not translated: the agent and its skills work in English. The button label is.
const getPrompt = ({ startLineNumber, startColumn, message, severity }: FixWithAiTarget) =>
  [
    `For the attached workflow, we get this validation ${severity} on line ${startLineNumber}, column ${startColumn}:`,
    message,
    'Fix it, verify the workflow is valid, and then give a concise explanation.',
  ].join('\n\n');

/**
 * Asks the agent to fix one validation error, from the editor diagnostic (Monaco quick fix)
 * or from the validation error list.
 */
export const useFixWithAi = ({
  editorRef,
  isAgentBuilderAvailable,
  isReadOnlyYaml,
  openAgentChat,
}: UseFixWithAiParams): UseFixWithAiReturn => {
  const isEnabled = isAgentBuilderAvailable && !isReadOnlyYaml;

  const fixWithAi = useCallback(
    (target: FixWithAiTarget) => {
      const editor = editorRef.current;
      if (editor) {
        navigateToErrorPosition(editor, target.startLineNumber, target.startColumn);
      }
      openAgentChat({
        initialMessage: getPrompt(target),
        // Prefill only, so the user can review or edit the prompt before sending
        autoSendInitialMessage: false,
        // `initialMessage` only applies to a new conversation
        newConversation: true,
      });
    },
    [editorRef, openAgentChat]
  );

  // The code action provider is registered once, so it reads the latest handler through a ref
  const fixWithAiRef = useRef(fixWithAi);
  useEffect(() => {
    fixWithAiRef.current = fixWithAi;
  }, [fixWithAi]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const disposable = registerFixWithAiCodeActionProvider({
      getFixWithAi: () => fixWithAiRef.current,
      isEditorModel: (model) =>
        model.uri.toString() === editorRef.current?.getModel()?.uri.toString(),
    });
    return () => disposable.dispose();
  }, [editorRef, isEnabled]);

  const onFixWithAi = useCallback(
    (error: YamlValidationResult) => {
      fixWithAi({
        startLineNumber: error.startLineNumber,
        startColumn: error.startColumn,
        message: error.message ?? '',
        severity: error.severity === 'error' ? 'error' : 'warning',
      });
    },
    [fixWithAi]
  );

  return { onFixWithAi: isEnabled ? onFixWithAi : undefined };
};
