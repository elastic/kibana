/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux-v7';
import { v4 } from 'uuid';
import type { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  type WorkflowEditorReadOnlyReason,
} from '@kbn/workflows/common/constants';
import type { YamlValidationResult } from '@kbn/workflows-yaml';
import { setAiAssisted } from '../../../../entities/workflows/store/workflow_detail/slice';
import {
  AttachmentBridge,
  consumeSidebarRestoreFor,
  findLinkedWorkflowAttachment,
  hasPersistedConversation,
  ProposalManager,
  setActiveProposalManager,
  setLastCreateSessionId,
  setSidebarOpen,
  WORKFLOW_EDITOR_ATTACHMENT_ID,
} from '../../../../features/ai_integration';
import { ProposalTracker } from '../../../../features/ai_integration/proposal_tracker';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTelemetry } from '../../../../hooks/use_telemetry';

interface UseAgentBuilderIntegrationParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  isEditorMounted?: boolean;
  workflowId?: string;
  workflowName?: string;
  validationErrors?: YamlValidationResult[] | null;
  /** Why the editor cannot apply changes; undefined when the user can edit. */
  readOnlyReason?: WorkflowEditorReadOnlyReason;
  /**
   * False while the editor cannot take agent proposals. Proposals wait until
   * it turns true. Defaults to true.
   */
  canApplyProposals?: boolean;
  /** Called when a proposal arrives while `canApplyProposals` is false. */
  onProposalDeferred?: () => void;
  /**
   * YAML of the Workflow tab. On the Executions tab the agent gets it instead of
   * the past run's YAML, because proposals apply there. Held proposals wait
   * until the editor shows it.
   */
  workflowTabYaml?: string;
}

export interface OpenAgentChatOptions {
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
  /**
   * Required for `initialMessage` to take effect: Agent Builder ignores
   * initial messages when restoring a persisted conversation.
   */
  newConversation?: boolean;
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
  readOnlyReason,
  canApplyProposals = true,
  onProposalDeferred,
  workflowTabYaml,
}: UseAgentBuilderIntegrationParams): UseAgentBuilderIntegrationReturn => {
  const { workflowsManagement, application } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const hasShowPrivilege = application.capabilities.agentBuilder?.show === true;
  const telemetry = useTelemetry();
  const dispatch = useDispatch();
  const proposalManagerRef = useRef<ProposalManager | null>(null);
  const attachmentBridgeRef = useRef<AttachmentBridge | null>(null);
  const trackerRef = useRef<ProposalTracker | null>(null);
  const chatOpenedReportedRef = useRef(false);
  const sessionAutoOpenedRef = useRef(false);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const syncAttachmentIdRef = useRef<string | undefined>(undefined);
  const attachmentTargetResolvedRef = useRef(true);
  const validationErrorsRef = useRef(validationErrors);
  validationErrorsRef.current = validationErrors;
  const readOnlyReasonRef = useRef(readOnlyReason);
  readOnlyReasonRef.current = readOnlyReason;
  const syncAttachmentRef = useRef<((yaml: string) => void) | null>(null);
  const canApplyProposalsRef = useRef(canApplyProposals);
  canApplyProposalsRef.current = canApplyProposals;
  const onProposalDeferredRef = useRef(onProposalDeferred);
  onProposalDeferredRef.current = onProposalDeferred;
  const executionsTabYaml = readOnlyReason === 'executions_tab' ? workflowTabYaml : undefined;
  const executionsTabYamlRef = useRef(executionsTabYaml);
  executionsTabYamlRef.current = executionsTabYaml;
  const chatRefHandle = useRef<{ close: () => void } | null>(null);
  const hasAutoOpenedRef = useRef(false);
  const unsavedWorkflowIdRef = useRef<string>(v4());
  const workflowNameRef = useRef(workflowName);
  workflowNameRef.current = workflowName;
  const [isChatAccessible, setIsChatAccessible] = useState(false);

  // Drives the chat session tag, which `carryConversationToWorkflow` rewrites
  // onto the saved workflow across the first save.
  const sessionId = workflowId ?? unsavedWorkflowIdRef.current;

  // Fixed, so saving a new workflow cannot move the attachment the conversation
  // is already writing into.
  const attachmentId = WORKFLOW_EDITOR_ATTACHMENT_ID;

  useEffect(() => {
    if (!agentBuilder || !hasShowPrivilege) {
      setIsChatAccessible(false);
      return;
    }

    let cancelled = false;

    void agentBuilder
      .getAgentBuilderAccess()
      .then((access) => {
        if (!cancelled) {
          setIsChatAccessible(access.hasRequiredLicense && access.hasLlmConnector);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsChatAccessible(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentBuilder, hasShowPrivilege]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!isEditorMounted || !editor || !agentBuilder || !hasShowPrivilege || !isChatAccessible) {
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
      setLastCreateSessionId(sessionId);
    }

    const bridge = new AttachmentBridge();
    bridge.start(manager, editorRef, tracker, {
      activeConversation$: agentBuilder.events.ui.activeConversation$,
      getChatEvents$: agentBuilder.events.getChatEvents$.bind(agentBuilder.events),
      attachmentId,
      workflowId,
      isReadOnly: () => !canApplyProposalsRef.current,
      onProposalDeferred: () => onProposalDeferredRef.current?.(),
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

    const buildAttachment = (editorYaml: string) =>
      buildWorkflowAttachment({
        yaml: executionsTabYamlRef.current ?? editorYaml,
        attachmentId: syncAttachmentIdRef.current ?? attachmentId,
        workflowId,
        workflowName: workflowNameRef.current,
        // Editor diagnostics describe the past run's YAML, not the one sent here.
        diagnostics:
          executionsTabYamlRef.current === undefined
            ? serializeClientDiagnostics(validationErrorsRef.current)
            : undefined,
        readOnlyReason: readOnlyReasonRef.current,
      });

    const unsubAllResolved = tracker.onAllResolved(() => {
      const yaml = editorRef.current?.getModel()?.getValue();
      if (yaml) {
        agentBuilder.addAttachment(buildAttachment(yaml));
      }
    });

    const syncAttachment = (yaml: string) => {
      if (!attachmentTargetResolvedRef.current) return;
      const attachment = buildAttachment(yaml);
      agentBuilder.setChatConfig({
        sessionTag: `workflow-editor:${sessionId}`,
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        attachments: [attachment],
      });
      agentBuilder.addAttachment(attachment);
    };
    syncAttachmentRef.current = syncAttachment;

    // The sidebar restores this session's last conversation, which may already
    // hold the attachment to write into. Adding one before it loads makes a
    // second.
    attachmentTargetResolvedRef.current = !hasPersistedConversation(sessionId);
    let originLinkRequested = false;

    // The chat UI publishes the conversation for every surface it renders, and
    // mints the id before the first request, so this covers new and resumed
    // conversations alike.
    const activeConversationSub = agentBuilder.events.ui.activeConversation$.subscribe(
      (activeConversation) => {
        // `null` means no chat surface is bound, which says nothing about the
        // conversation the sidebar will restore.
        if (!activeConversation) return;
        if (activeConversation.id) {
          conversationIdRef.current = activeConversation.id;
        }

        if (activeConversation.id && !activeConversation.conversation) {
          attachmentTargetResolvedRef.current = false;
          return;
        }

        const linked = findLinkedWorkflowAttachment({
          attachments: activeConversation.conversation?.attachments,
          attachmentId,
          workflowId,
        });
        const previousAttachmentId = syncAttachmentIdRef.current ?? attachmentId;
        const linkedAttachmentChanged = linked !== undefined && linked.id !== previousAttachmentId;
        if (linked) {
          if (linkedAttachmentChanged) {
            agentBuilder.removeAttachment(previousAttachmentId);
          }
          syncAttachmentIdRef.current = linked.id;
          bridge.setAttachmentId(linked.id);
        }

        if (!attachmentTargetResolvedRef.current || linkedAttachmentChanged) {
          attachmentTargetResolvedRef.current = true;
          const yaml = editorRef.current?.getModel()?.getValue();
          if (yaml !== undefined) syncAttachment(yaml);
        }

        // A create-session attachment predates the workflow, so nothing has
        // pointed it at one yet.
        const conversationId = activeConversation.id;
        if (!conversationId || !workflowId || originLinkRequested) return;
        if (!linked || linked.origin === workflowId) return;
        originLinkRequested = true;
        void agentBuilder
          .updateAttachmentOrigin(conversationId, linked.id, workflowId)
          .catch(() => {
            originLinkRequested = false;
          });
      }
    );

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
      syncAttachmentIdRef.current = undefined;
      attachmentTargetResolvedRef.current = true;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      modelListener?.dispose();
      syncAttachmentRef.current = null;
      activeConversationSub.unsubscribe();
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
  }, [
    isEditorMounted,
    editorRef,
    agentBuilder,
    hasShowPrivilege,
    isChatAccessible,
    attachmentId,
    sessionId,
    workflowId,
    telemetry,
    dispatch,
  ]);

  // Proposals are diffed against the editor content, so they pause while the
  // editor shows a past execution and come back with the Workflow tab YAML.
  useEffect(() => {
    const bridge = attachmentBridgeRef.current;
    const manager = proposalManagerRef.current;
    const model = editorRef.current?.getModel();
    if (!bridge || !manager || !model) return;

    if (!canApplyProposals) {
      manager.suspend();
      return;
    }
    if (!bridge.hasDeferred() && !manager.hasSuspendedProposals()) return;

    const showProposals = () => {
      manager.resume();
      bridge.applyDeferred();
    };
    if (workflowTabYaml === undefined || model.getValue() === workflowTabYaml) {
      showProposals();
      return;
    }
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    const listener = model.onDidChangeContent(() => {
      if (model.getValue() !== workflowTabYaml) return;
      listener.dispose();
      // Editing the model inside its own change event is a nested edit, and the
      // code editor mutes `onChange` during its value write. Apply after the event.
      showTimer = setTimeout(showProposals);
    });
    return () => {
      listener.dispose();
      clearTimeout(showTimer);
    };
  }, [canApplyProposals, workflowTabYaml, editorRef]);

  const openAgentChat = useCallback(
    (options?: OpenAgentChatOptions) => {
      if (!agentBuilder || !isChatAccessible) {
        return;
      }

      const currentYaml = executionsTabYaml ?? editorRef.current?.getModel()?.getValue() ?? '';
      // A new conversation has no restored attachment to wait for, so attach the YAML now.
      // Otherwise the active-conversation subscription adds it once it knows which
      // conversation this session shares.
      const shouldAttachNow =
        attachmentTargetResolvedRef.current || options?.newConversation === true;

      const { chatRef } = agentBuilder.openChat({
        sessionTag: `workflow-editor:${sessionId}`,
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        initialMessage: options?.initialMessage,
        autoSendInitialMessage: options?.autoSendInitialMessage,
        newConversation: options?.newConversation,
        attachments: shouldAttachNow
          ? [
              buildWorkflowAttachment({
                yaml: currentYaml,
                attachmentId: syncAttachmentIdRef.current ?? attachmentId,
                workflowId,
                workflowName,
                diagnostics:
                  executionsTabYaml === undefined
                    ? serializeClientDiagnostics(validationErrors)
                    : undefined,
                readOnlyReason,
              }),
            ]
          : [],
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
    [
      agentBuilder,
      isChatAccessible,
      editorRef,
      attachmentId,
      sessionId,
      workflowId,
      workflowName,
      validationErrors,
      readOnlyReason,
      executionsTabYaml,
      telemetry,
    ]
  );

  // The model listener misses changes that leave the editor content as is, such
  // as a tab switch. Re-sync so the agent sees the current state.
  const isFirstStateSyncRef = useRef(true);
  useEffect(() => {
    if (isFirstStateSyncRef.current) {
      isFirstStateSyncRef.current = false;
      return;
    }
    const yaml = editorRef.current?.getModel()?.getValue();
    if (yaml !== undefined) syncAttachmentRef.current?.(yaml);
  }, [readOnlyReason, executionsTabYaml, editorRef]);

  // Restore the sidebar only when the save thunk requested it (create → first
  // save → detail remount). Never auto-open on /create — the canvas creation
  // panel owns the AI entry point there. Never on an existing workflow the
  // user navigated to directly. Guarded per-mount so a manual close stays.
  useEffect(() => {
    if (!isEditorMounted || !agentBuilder || !isChatAccessible) return;
    if (hasAutoOpenedRef.current) return;
    if (workflowId == null) return;

    const shouldRestoreForSavedWorkflow = consumeSidebarRestoreFor(workflowId);
    if (!shouldRestoreForSavedWorkflow) return;

    hasAutoOpenedRef.current = true;
    openAgentChat({ isAutoOpen: true });
  }, [isEditorMounted, agentBuilder, isChatAccessible, workflowId, openAgentChat]);

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
    isAgentBuilderAvailable: agentBuilder != null && isChatAccessible,
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
  readOnlyReason,
}: {
  yaml: string;
  attachmentId: string;
  workflowId?: string;
  workflowName?: string;
  diagnostics: ReturnType<typeof serializeClientDiagnostics>;
  readOnlyReason?: WorkflowEditorReadOnlyReason;
}) => ({
  id: attachmentId,
  type: WORKFLOW_YAML_ATTACHMENT_TYPE,
  // Lets a later session find this attachment. A workflow being created has no
  // id yet; `updateAttachmentOrigin` links it after the first save.
  ...(workflowId ? { origin: workflowId } : {}),
  data: {
    yaml,
    workflowId,
    name: workflowName,
    clientDiagnostics: diagnostics,
    readOnlyReason,
  },
});
