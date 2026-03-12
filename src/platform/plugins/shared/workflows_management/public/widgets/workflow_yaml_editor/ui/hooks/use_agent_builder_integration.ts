/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { monaco } from '@kbn/monaco';
import {
  AttachmentBridge,
  baseProposalId,
  ProposalManager,
  setProposalActionHandlers,
  updateProposalStatus,
} from '../../../../features/ai_integration';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';
import { useKibana } from '../../../../hooks/use_kibana';

interface UseAgentBuilderIntegrationParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  isEditorMounted?: boolean;
  workflowId?: string;
  workflowName?: string;
  validationErrors?: YamlValidationResult[] | null;
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

const serializeClientDiagnostics = (
  errors: YamlValidationResult[] | null | undefined
): Array<{ severity: string; message: string; source: string }> | undefined => {
  if (!errors || errors.length === 0) return undefined;
  const relevant = errors.filter(
    (e): e is YamlValidationResult & { severity: 'error' | 'warning'; message: string } =>
      (e.severity === 'error' || e.severity === 'warning') && e.message != null
  );
  if (relevant.length === 0) return undefined;
  return relevant.map((e) => ({
    severity: e.severity,
    message: e.message,
    source: e.owner,
  }));
};

export const useAgentBuilderIntegration = ({
  editorRef,
  isEditorMounted,
  workflowId,
  workflowName,
  validationErrors,
}: UseAgentBuilderIntegrationParams): UseAgentBuilderIntegrationReturn => {
  const { workflowsManagement } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const proposalManagerRef = useRef<ProposalManager | null>(null);
  const attachmentBridgeRef = useRef<AttachmentBridge | null>(null);
  const validationErrorsRef = useRef(validationErrors);
  validationErrorsRef.current = validationErrors;

  useEffect(() => {
    const editor = editorRef.current;
    if (!isEditorMounted || !editor || !agentBuilder) return;

    const manager = new ProposalManager();
    manager.initialize(editor, {
      onAccept: (hunkId) => {
        updateProposalStatus(baseProposalId(hunkId), 'accepted');
      },
      onReject: (hunkId) => {
        updateProposalStatus(baseProposalId(hunkId), 'declined');
      },
    });

    proposalManagerRef.current = manager;

    setProposalActionHandlers({
      acceptProposal: (proposalId) => {
        const m = proposalManagerRef.current;
        if (!m) return false;
        const pending = m.getPendingProposals();
        const matches = pending.filter(
          (p) => p.proposalId === proposalId || baseProposalId(p.proposalId) === proposalId
        );
        if (matches.length === 0) return false;
        for (const match of matches) {
          m.acceptProposal(match.proposalId);
        }
        return true;
      },
      declineProposal: (proposalId) => {
        const m = proposalManagerRef.current;
        if (!m) return false;
        const pending = m.getPendingProposals();
        const matches = pending.filter(
          (p) => p.proposalId === proposalId || baseProposalId(p.proposalId) === proposalId
        );
        if (matches.length === 0) return false;
        for (const match of matches) {
          m.rejectProposal(match.proposalId);
        }
        return true;
      },
    });

    const bridge = new AttachmentBridge();
    bridge.start(agentBuilder.events.chat$, manager, editorRef);
    attachmentBridgeRef.current = bridge;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let modelListener: monaco.IDisposable | null = null;
    const attachmentId = workflowId ?? 'new-workflow';
    const model = editor.getModel();
    if (model) {
      modelListener = model.onDidChangeContent(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const currentYaml = model.getValue();
          agentBuilder.addAttachment({
            id: attachmentId,
            type: 'workflow.yaml',
            data: {
              yaml: currentYaml,
              workflowId,
              name: workflowName,
              clientDiagnostics: serializeClientDiagnostics(validationErrorsRef.current),
            },
          });
        }, 500);
      });
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      modelListener?.dispose();
      bridge.stop();
      attachmentBridgeRef.current = null;
      manager.dispose();
      proposalManagerRef.current = null;
      setProposalActionHandlers(null);
    };
  }, [isEditorMounted, editorRef, agentBuilder, workflowId, workflowName]);

  const openAgentChat = useCallback(
    (options?: OpenAgentChatOptions) => {
      if (!agentBuilder) return;

      const editor = editorRef.current;
      const currentYaml = editor?.getModel()?.getValue() ?? '';

      agentBuilder.openConversationFlyout({
        initialMessage: options?.initialMessage,
        autoSendInitialMessage: options?.autoSendInitialMessage,
        attachments: [
          {
            type: 'workflow.yaml',
            data: {
              workflowId,
              name: workflowName,
              yaml: currentYaml,
              clientDiagnostics: serializeClientDiagnostics(validationErrors),
            },
          },
        ],
      });
    },
    [agentBuilder, editorRef, workflowId, workflowName, validationErrors]
  );

  return {
    openAgentChat,
    isAgentBuilderAvailable: agentBuilder != null,
    proposalManager: proposalManagerRef.current,
  };
};
