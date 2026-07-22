/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux-v7';
import { v4 } from 'uuid';
import { isConversationIdSetEvent } from '@kbn/agent-builder-common/chat/events';
import type { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { setAiAssisted } from '../../../../entities/workflows/store/workflow_detail/slice';
import {
  AttachmentBridge,
  consumeSidebarRestoreFor,
  ProposalManager,
  setActiveProposalManager,
  setLastCreateAttachmentId,
  setSidebarOpen,
} from '../../../../features/ai_integration';
import { ProposalTracker } from '../../../../features/ai_integration/proposal_tracker';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTelemetry } from '../../../../hooks/use_telemetry';

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
  // Internal: auto-open path from the mount effect. Tags the chat-opened /
  // session-completed events with `autoOpened: true` so analysts can filter
  // out non-deliberate opens when measuring engagement.
  isAutoOpen?: boolean;
}

interface UseAgentBuilderIntegrationReturn {
  openAgentChat: (options?: OpenAgentChatOptions) => void;
  isAgentBuilderAvailable: boolean;
  proposalManager: ProposalManager | null;
}

const ATTACHMENT_SYNC_DEBOUNCE_TIME = 500;

const WORKFLOW_EDITOR_GREETING = i18n.translate(
  'workflowsManagement.agentBuilder.workflowEditorGreeting',
  { defaultMessage: 'What do you want to automate?' }
);

export const useAgentBuilderIntegration = ({
  editorRef,
  isEditorMounted,
  workflowId,
  workflowName,
  validationErrors,
}: UseAgentBuilderIntegrationParams): UseAgentBuilderIntegrationReturn => {
  const { workflowsManagement } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const telemetry = useTelemetry();
  const dispatch = useDispatch();
  const proposalManagerRef = useRef<ProposalManager | null>(null);
  const attachmentBridgeRef = useRef<AttachmentBridge | null>(null);
  const trackerRef = useRef<ProposalTracker | null>(null);
  const chatOpenedReportedRef = useRef(false);
  const sessionAutoOpenedRef = useRef(false);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const validationErrorsRef = useRef(validationErrors);
  validationErrorsRef.current = validationErrors;
  const chatRefHandle = useRef<{ close: () => void } | null>(null);
  const hasAutoOpenedRef = useRef(false);
  const unsavedWorkflowIdRef = useRef<string>(v4());
  const workflowNameRef = useRef(workflowName);
  workflowNameRef.current = workflowName;

  const attachmentId = workflowId ?? unsavedWorkflowIdRef.current;

  useEffect(() => {
    const editor = editorRef.current;
    if (!isEditorMounted || !editor || !agentBuilder) {
      return;
    }

    const tracker = new ProposalTracker();
    trackerRef.current = tracker;

    const sessionType = workflowId ? 'edit' : 'create';

    const manager = new ProposalManager();
    manager.initialize(editor, {
      onHunkAccepted: () => {
        dispatch(setAiAssisted(true));
        const pending = tracker.getAllRecords().find((r) => r.status === 'pending');
        if (pending) {
          tracker.updateStatus(pending.proposalId, 'accepted');
          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: pending.proposalId,
            resolution: 'accepted',
            toolId: pending.toolId,
            isBulkAction: false,
          });
        }
      },
      onHunkRejected: () => {
        const pending = tracker.getAllRecords().find((r) => r.status === 'pending');
        if (pending) {
          tracker.cascadeDecline(pending.proposalId);
          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: pending.proposalId,
            resolution: 'rejected',
            toolId: pending.toolId,
            isBulkAction: false,
          });
        }
      },
      onAccept: ({ isBulkAction }) => {
        const pendingRecords = tracker.getAllRecords().filter((r) => r.status === 'pending');

        if (pendingRecords.length > 0) {
          dispatch(setAiAssisted(true));
        }

        for (const record of pendingRecords) {
          tracker.updateStatus(record.proposalId, 'accepted');

          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: record.proposalId,
            resolution: 'accepted',
            toolId: record.toolId,
            isBulkAction,
          });
        }
      },
      onReject: ({ isBulkAction }) => {
        const pendingRecords = tracker.getAllRecords().filter((r) => r.status === 'pending');

        for (const record of pendingRecords) {
          tracker.cascadeDecline(record.proposalId);

          telemetry.reportAiProposalResolved({
            workflowId,
            conversationId: conversationIdRef.current,
            proposalId: record.proposalId,
            resolution: 'rejected',
            toolId: record.toolId,
            isBulkAction,
          });
        }
      },
    });

    proposalManagerRef.current = manager;
    setActiveProposalManager(manager);

    // Only set on the create route — the value is consumed by
    // `carryConversationToWorkflow` in the save thunk. Clearing here on
    // workflowId presence would race that consume after setWorkflow re-fires
    // this effect.
    if (!workflowId) {
      setLastCreateAttachmentId(attachmentId);
    }

    const bridge = new AttachmentBridge();
    bridge.start(agentBuilder.events.chat$, manager, editorRef, tracker, {
      attachmentId,
      workflowId,
      getChatEvents$: agentBuilder.events.getChatEvents$?.bind(agentBuilder.events),
      onProposalReceived: ({ proposalId, toolId }) => {
        telemetry.reportAiProposalReceived({
          workflowId,
          conversationId: conversationIdRef.current,
          proposalId,
          toolId,
          sessionType,
        });
      },
    });
    attachmentBridgeRef.current = bridge;

    const conversationIdSub = agentBuilder.events.chat$.subscribe((event) => {
      if (isConversationIdSetEvent(event)) {
        conversationIdRef.current = event.data.conversation_id;
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__wfTestBridge = {
      injectYamlChange: (afterYaml: string) => bridge.injectYamlChange(afterYaml),
      getEditorValue: () => editorRef.current?.getModel()?.getValue() ?? '',
      revealNextProposal: () => {
        const hunks = manager.getDiffHunks();
        if (hunks.length > 0 && editorRef.current) {
          editorRef.current.setPosition({ lineNumber: hunks[0].modifiedStartLine, column: 1 });
          editorRef.current.revealLineInCenter(hunks[0].modifiedStartLine);
        }
      },
    };

    const buildAttachment = (yaml: string) =>
      buildWorkflowAttachment({
        yaml,
        attachmentId,
        workflowId,
        workflowName: workflowNameRef.current,
        diagnostics: serializeClientDiagnostics(validationErrorsRef.current),
      });

    const unsubAllResolved = tracker.onAllResolved(() => {
      const yaml = editorRef.current?.getModel()?.getValue();
      if (yaml) {
        agentBuilder.addAttachment(buildAttachment(yaml));
      }
    });

    const syncAttachment = (yaml: string) => {
      const attachment = buildAttachment(yaml);
      agentBuilder.setChatConfig({
        sessionTag: `workflow-editor:${attachmentId}`,
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        attachments: [attachment],
      });
      agentBuilder.addAttachment(attachment);
    };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let modelListener: monaco.IDisposable | null = null;
    const model = editor.getModel();
    if (model) {
      syncAttachment(model.getValue());

      modelListener = model.onDidChangeContent(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          syncAttachment(model.getValue());
        }, ATTACHMENT_SYNC_DEBOUNCE_TIME);
      });
    }

    return () => {
      if (chatOpenedReportedRef.current) {
        const records = tracker.getAllRecords();
        telemetry.reportWorkflowAiSessionCompleted({
          sessionType,
          workflowId,
          conversationId: conversationIdRef.current,
          proposalsAccepted: records.filter((r) => r.status === 'accepted').length,
          proposalsDeclined: records.filter((r) => r.status === 'declined').length,
          proposalsPending: records.filter((r) => r.status === 'pending').length,
          autoOpened: sessionAutoOpenedRef.current,
        });
      }
      chatOpenedReportedRef.current = false;
      sessionAutoOpenedRef.current = false;
      conversationIdRef.current = undefined;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      modelListener?.dispose();
      conversationIdSub.unsubscribe();
      // Don't close the sidebar here — this runs on every deps change
      // (including the workflowId flip after Save). Close lives in the
      // unmount-only effect below.
      agentBuilder.clearChatConfig();
      bridge.stop();
      attachmentBridgeRef.current = null;
      setActiveProposalManager(null);
      manager.dispose();
      proposalManagerRef.current = null;
      unsubAllResolved();
      tracker.clearAll();
      trackerRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__wfTestBridge;
    };
  }, [isEditorMounted, editorRef, agentBuilder, attachmentId, workflowId, telemetry, dispatch]);

  const openAgentChat = useCallback(
    (options?: OpenAgentChatOptions) => {
      if (!agentBuilder) {
        return;
      }

      const currentYaml = editorRef.current?.getModel()?.getValue() ?? '';

      const { chatRef } = agentBuilder.openChat({
        sessionTag: `workflow-editor:${attachmentId}`,
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        initialMessage: options?.initialMessage,
        autoSendInitialMessage: options?.autoSendInitialMessage,
        attachments: [
          buildWorkflowAttachment({
            yaml: currentYaml,
            attachmentId,
            workflowId,
            workflowName,
            diagnostics: serializeClientDiagnostics(validationErrors),
          }),
        ],
        onClose: () => setSidebarOpen(false),
      });
      chatRefHandle.current = chatRef;
      setSidebarOpen(true);

      if (!chatOpenedReportedRef.current) {
        sessionAutoOpenedRef.current = options?.isAutoOpen === true;
        telemetry.reportWorkflowAiChatOpened({
          entryPoint: 'workflow_editor',
          sessionType: workflowId ? 'edit' : 'create',
          workflowId,
          autoOpened: sessionAutoOpenedRef.current,
        });
        chatOpenedReportedRef.current = true;
      }
    },
    [agentBuilder, editorRef, attachmentId, workflowId, workflowName, validationErrors, telemetry]
  );

  // Auto-open only on /workflows/create, or on a saved workflow whose sidebar
  // the save thunk requested we restore. Never on an existing workflow the
  // user navigated to directly. Guarded per-mount so a manual close stays.
  useEffect(() => {
    if (!isEditorMounted || !agentBuilder) {
      return;
    }
    if (hasAutoOpenedRef.current) {
      return;
    }

    const shouldRestoreForSavedWorkflow =
      workflowId != null && consumeSidebarRestoreFor(workflowId);

    if (workflowId != null && !shouldRestoreForSavedWorkflow) {
      return;
    }

    hasAutoOpenedRef.current = true;
    openAgentChat({ isAutoOpen: true });
  }, [isEditorMounted, agentBuilder, workflowId, openAgentChat]);

  // Close the sidebar on unmount (leaving the workflow scope). Empty deps so
  // it does not fire on prop changes. `application.navigateToApp` remounts
  // the tree, so create → detail also fires this — the save thunk handles
  // that case via `requestSidebarRestore`.
  useEffect(() => {
    return () => {
      chatRefHandle.current?.close();
      chatRefHandle.current = null;
      setSidebarOpen(false);
    };
  }, []);

  return {
    openAgentChat,
    isAgentBuilderAvailable: agentBuilder != null,
    proposalManager: proposalManagerRef.current,
  };
};

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

const buildWorkflowAttachment = ({
  yaml,
  attachmentId,
  workflowId,
  workflowName,
  diagnostics,
}: {
  yaml: string;
  attachmentId: string;
  workflowId?: string;
  workflowName?: string;
  diagnostics: ReturnType<typeof serializeClientDiagnostics>;
}) => ({
  id: attachmentId,
  type: WORKFLOW_YAML_ATTACHMENT_TYPE,
  data: {
    yaml,
    workflowId,
    name: workflowName,
    clientDiagnostics: diagnostics,
  },
});
