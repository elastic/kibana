/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, stringify } from 'query-string';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import type { Document } from 'yaml';
import type { monaco } from '@kbn/monaco';
import {
  createDeleteStepTool,
  createInsertStepTool,
  createModifyStepPropertyTool,
  createModifyStepTool,
  createModifyWorkflowPropertyTool,
  createReplaceYamlTool,
  initProposalPersistence,
  ProposalManager,
  setProposalActionHandlers,
  suspendPersistence,
  updateProposalStatus,
} from '../../../../features/ai_integration';
import type { BrowserApiToolDefinition, EditorContext } from '../../../../features/ai_integration';
import { useKibana } from '../../../../hooks/use_kibana';

interface UseAgentBuilderIntegrationParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  yamlDocumentRef: React.MutableRefObject<Document | null>;
  isEditorMounted?: boolean;
  workflowId?: string;
  workflowName?: string;
}

interface OpenAgentChatOptions {
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
}

interface UseAgentBuilderIntegrationReturn {
  openAgentChat: (options?: OpenAgentChatOptions) => void;
  isAgentBuilderAvailable: boolean;
  proposalManager: ProposalManager | null;
}

export const useAgentBuilderIntegration = ({
  editorRef,
  yamlDocumentRef,
  isEditorMounted,
  workflowId,
  workflowName,
}: UseAgentBuilderIntegrationParams): UseAgentBuilderIntegrationReturn => {
  const { workflowsManagement } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const proposalManagerRef = useRef<ProposalManager | null>(null);
  const history = useHistory();

  useEffect(() => {
    initProposalPersistence(workflowId);
  }, [workflowId]);

  useEffect(() => {
    if (!workflowId) return;
    const params = parse(history.location.search);
    const urlConversationId = params.conversationId as string | undefined;
    if (urlConversationId) {
      const sessionTag = `workflow-${workflowId}`;
      const key = `agentBuilder.lastConversation.${sessionTag}.default`;
      localStorage.setItem(key, JSON.stringify(urlConversationId));
    }
  }, [workflowId, history]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!isEditorMounted || !editor) return;

    const manager = new ProposalManager();
    manager.initialize(editor, {
      onAccept: (proposalId) => {
        updateProposalStatus(proposalId, 'accepted');
      },
      onReject: (proposalId) => {
        updateProposalStatus(proposalId, 'declined');
      },
    });

    proposalManagerRef.current = manager;

    setProposalActionHandlers({
      acceptProposal: (proposalId) => {
        const m = proposalManagerRef.current;
        if (!m) return false;
        const pending = m.getPendingProposals();
        const match = pending.find((p) => p.proposalId === proposalId);
        if (!match) return false;
        m.acceptProposal(proposalId);
        return true;
      },
      declineProposal: (proposalId) => {
        const m = proposalManagerRef.current;
        if (!m) return false;
        const pending = m.getPendingProposals();
        const match = pending.find((p) => p.proposalId === proposalId);
        if (!match) return false;
        m.rejectProposal(proposalId);
        return true;
      },
    });

    return () => {
      suspendPersistence();
      manager.dispose();
      proposalManagerRef.current = null;
      setProposalActionHandlers(null);
    };
  }, [isEditorMounted, editorRef]);

  const editorContext: EditorContext = useMemo(
    () => ({
      getEditor: () => editorRef.current,
      getYamlDocument: () => yamlDocumentRef.current,
      getProposedChangesManager: () => proposalManagerRef.current,
    }),
    [editorRef, yamlDocumentRef]
  );

  const browserApiTools: Array<BrowserApiToolDefinition<unknown>> = useMemo(
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

  const syncConversationIdToUrl = useCallback(() => {
    const sessionTag = workflowId ? `workflow-${workflowId}` : 'workflow-new';
    const storageKey = `agentBuilder.lastConversation.${sessionTag}.default`;

    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const id = JSON.parse(raw);
          if (id && typeof id === 'string') {
            const currentParams = parse(history.location.search);
            if (currentParams.conversationId !== id) {
              history.replace({
                ...history.location,
                search: `?${stringify(
                  { ...currentParams, conversationId: id },
                  { encode: false }
                )}`,
              });
            }
            clearInterval(poll);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }, 300);

    const timeout = setTimeout(() => clearInterval(poll), 5000);
    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [workflowId, history]);

  const openAgentChat = useCallback(
    (options?: OpenAgentChatOptions) => {
      if (!agentBuilder) return;

      const editor = editorRef.current;
      const currentYaml = editor?.getModel()?.getValue() ?? '';

      agentBuilder.openConversationFlyout({
        sessionTag: workflowId ? `workflow-${workflowId}` : 'workflow-new',
        initialMessage: options?.initialMessage,
        autoSendInitialMessage: options?.autoSendInitialMessage,
        attachments: [
          {
            type: 'workflow.yaml',
            data: {
              workflowId,
              name: workflowName,
              yaml: currentYaml,
            },
          },
        ],
        browserApiTools,
      });

      syncConversationIdToUrl();
    },
    [agentBuilder, editorRef, workflowId, workflowName, browserApiTools, syncConversationIdToUrl]
  );

  return {
    openAgentChat,
    isAgentBuilderAvailable: agentBuilder != null,
    proposalManager: proposalManagerRef.current,
  };
};
