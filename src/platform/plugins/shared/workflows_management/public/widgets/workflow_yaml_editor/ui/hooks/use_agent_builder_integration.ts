/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Document } from 'yaml';
import type { monaco } from '@kbn/monaco';
import {
  createDeleteStepTool,
  createInsertStepTool,
  createModifyStepPropertyTool,
  createModifyStepTool,
  createModifyWorkflowPropertyTool,
  createReplaceYamlTool,
  ProposedChangesManager,
  InlineEditInputManager,
  executeHeadlessAgent,
} from '../../../../features/ai_integration';
import { useKibana } from '../../../../hooks/use_kibana';
import { registerFixInChatCodeActionProvider } from '../../lib/monaco_providers';

export const WORKFLOW_EDITOR_AGENT_ID = 'platform.workflows.editor';

interface UseAgentBuilderIntegrationParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  yamlDocumentRef: React.MutableRefObject<Document | null>;
  /** Set to true once the editor is mounted */
  isEditorMounted?: boolean;
}

interface OpenAgentChatOptions {
  /** Initial message to send to the agent */
  initialMessage?: string;
  /** Error context to include */
  errorContext?: {
    message: string;
    lineNumber: number;
    columnNumber: number;
  };
  /** Whether to auto-send the initial message */
  autoSend?: boolean;
}

interface UseAgentBuilderIntegrationReturn {
  /** Opens the Agent Builder chat flyout with the current workflow YAML as context */
  openAgentChat: (options?: OpenAgentChatOptions) => void;
  /** Opens the inline edit input (Cursor-like Cmd+K) */
  openInlineEdit: (selection: monaco.Selection, selectedText: string) => void;
  /** Whether the Agent Builder integration is available */
  isAgentBuilderAvailable: boolean;
  /** The proposed changes manager for accept/reject UX */
  proposedChangesManager: ProposedChangesManager | null;
}

/**
 * Hook to integrate the Workflow YAML Editor with the Agent Builder.
 * Provides browser API tools with Cursor-like accept/reject UX for proposed changes.
 */
export function useAgentBuilderIntegration({
  editorRef,
  yamlDocumentRef,
  isEditorMounted = false,
}: UseAgentBuilderIntegrationParams): UseAgentBuilderIntegrationReturn {
  const { agentBuilder, application, notifications, http } = useKibana().services;

  // Create the ProposedChangesManager instance
  const proposedChangesManagerRef = useRef<ProposedChangesManager | null>(null);

  // Create the InlineEditInputManager instance
  const inlineEditManagerRef = useRef<InlineEditInputManager | null>(null);

  // Initialize the ProposedChangesManager when editor is mounted
  useEffect(() => {
    // Wait until the editor is actually mounted
    if (!isEditorMounted) return;

    const editor = editorRef.current;
    if (!editor) return;

    // Create and initialize the manager
    const manager = new ProposedChangesManager();
    manager.initialize(editor, {
      onAccept: (change) => {
        notifications?.toasts.addSuccess({
          title: 'Change applied',
          text: change.description || 'The proposed change has been applied.',
          toastLifeTimeMs: 2000,
        });
      },
      onReject: (change) => {
        notifications?.toasts.addInfo({
          title: 'Change rejected',
          text: change.description
            ? `Rejected: ${change.description}`
            : 'The proposed change was rejected.',
          toastLifeTimeMs: 2000,
        });
      },
    });

    proposedChangesManagerRef.current = manager;

    // Initialize the InlineEditInputManager
    const inlineEditManager = new InlineEditInputManager();
    inlineEditManager.initialize(editor);
    inlineEditManagerRef.current = inlineEditManager;

    return () => {
      manager.dispose();
      proposedChangesManagerRef.current = null;
      inlineEditManager.dispose();
      inlineEditManagerRef.current = null;
    };
  }, [editorRef, isEditorMounted, notifications?.toasts]);

  // Check if agent builder is available and user has access
  const isAgentBuilderAvailable = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capabilities = application?.capabilities as any;
    return !!agentBuilder?.openConversationFlyout && capabilities?.agentBuilder?.show === true;
  }, [agentBuilder, application?.capabilities]);

  // Store openAgentChat in a ref so we can use it in the code action provider
  // without creating circular dependencies
  const openAgentChatRef = useRef<((options?: OpenAgentChatOptions) => void) | null>(null);

  // Create stable context object for browser API tools
  const editorContext = useMemo(
    () => ({
      getEditor: () => editorRef.current,
      getYamlDocument: () => yamlDocumentRef.current,
      getProposedChangesManager: () => proposedChangesManagerRef.current,
    }),
    [editorRef, yamlDocumentRef]
  );

  // Create browser API tools with proposed changes support
  const browserApiTools = useMemo(
    () => [
      createInsertStepTool(editorContext),
      createModifyStepTool(editorContext),
      createModifyStepPropertyTool(editorContext),
      createModifyWorkflowPropertyTool(editorContext),
      createDeleteStepTool(editorContext),
      createReplaceYamlTool(editorContext),
    ],
    [editorContext]
  );

  const openAgentChat = useCallback(
    (options?: OpenAgentChatOptions) => {
      if (!agentBuilder?.openConversationFlyout) {
        // eslint-disable-next-line no-console
        console.warn('[useAgentBuilderIntegration] Agent Builder not available');
        return;
      }

      const currentYaml = editorRef.current?.getValue() ?? '';

      // Build the initial message if error context is provided
      let initialMessage = options?.initialMessage;
      if (options?.errorContext && !initialMessage) {
        // Extract the code snippet around the error for better context
        const lines = currentYaml.split('\n');
        const errorLine = options.errorContext.lineNumber;
        const startLine = Math.max(0, errorLine - 3);
        const endLine = Math.min(lines.length, errorLine + 2);
        const codeSnippet = lines
          .slice(startLine, endLine)
          .map((line, idx) => {
            const lineNum = startLine + idx + 1;
            const marker = lineNum === errorLine ? '>>> ' : '    ';
            return `${marker}${lineNum}: ${line}`;
          })
          .join('\n');

        initialMessage = `Please fix this validation error in my workflow.

**Error:** ${options.errorContext.message}
**Location:** Line ${options.errorContext.lineNumber}, Column ${options.errorContext.columnNumber}

**Code around the error:**
\`\`\`yaml
${codeSnippet}
\`\`\`

**IMPORTANT:** If this is a "step type not valid" error:
1. First call \`platform.workflows.get_step_definitions\` to see what step types ARE available
2. Check if the step type in the error exists in that list
3. If it doesn't exist, tell me what step types are available - don't just replace it with something random
4. Only propose a fix if you know the correct replacement

If you can fix it, use the workflow tools to propose a change I can accept/reject.`;
      }

      agentBuilder.openConversationFlyout({
        agentId: WORKFLOW_EDITOR_AGENT_ID,
        sessionTag: 'workflow-editor',
        newConversation: true,
        attachments: [
          {
            type: 'workflow.yaml',
            data: { yaml: currentYaml },
          },
        ],
        browserApiTools,
        initialMessage,
        // Auto-send the message when explicitly requested or when there's an error context
        autoSendInitialMessage: options?.autoSend ?? !!options?.errorContext,
      });
    },
    [agentBuilder, browserApiTools, editorRef]
  );

  // Keep the ref updated with the latest openAgentChat callback
  openAgentChatRef.current = openAgentChat;

  // Open inline edit input (Cursor-like Cmd+K experience)
  const openInlineEdit = useCallback(
    (selection: monaco.Selection, selectedText: string) => {
      if (!isAgentBuilderAvailable) {
        return;
      }

      const inlineEditManager = inlineEditManagerRef.current;
      if (!inlineEditManager) {
        return;
      }

      // Show the inline edit input
      inlineEditManager.show(selection, selectedText, async (instruction, codeToEdit) => {
        // Get the current YAML for context
        const currentYaml = editorRef.current?.getValue() ?? '';

        inlineEditManager.updateStatus('Sending to AI...');

        try {
          // Execute the agent headlessly (without flyout)
          const result = await executeHeadlessAgent(http!, {
            agentId: WORKFLOW_EDITOR_AGENT_ID,
            message: `Edit this YAML code:

\`\`\`yaml
${codeToEdit}
\`\`\`

**Instruction:** ${instruction}

Use the workflow browser tools to propose the exact change. Do not explain, just make the change.`,
            attachments: [
              {
                type: 'workflow.yaml',
                data: { yaml: currentYaml },
              },
            ],
            browserApiTools,
            editorContext,
            onStatus: (status) => {
              inlineEditManager.updateStatus(status);
            },
          });

          if (!result.success) {
            // Show error in the inline edit UI instead of falling back to flyout
            inlineEditManager.updateStatus(`Error: ${result.error?.message || 'Unknown error'}`);
            // Keep the inline edit open for 2 seconds to show the error
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[InlineEdit] Error:', error);
          inlineEditManager.updateStatus('Error occurred');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      });
    },
    [isAgentBuilderAvailable, browserApiTools, editorContext, editorRef, http, openAgentChat]
  );

  // Register the "Fix in Chat" code action provider when agent builder is available
  useEffect(() => {
    if (!isEditorMounted || !isAgentBuilderAvailable) return;

    const editor = editorRef.current;
    if (!editor) return;

    const disposable = registerFixInChatCodeActionProvider(editor, (errorContext) => {
      // Use the ref to always get the latest callback
      openAgentChatRef.current?.({ errorContext });
    });

    return () => {
      disposable.dispose();
    };
  }, [editorRef, isEditorMounted, isAgentBuilderAvailable]);

  return {
    openAgentChat,
    openInlineEdit,
    isAgentBuilderAvailable,
    proposedChangesManager: proposedChangesManagerRef.current,
  };
}
