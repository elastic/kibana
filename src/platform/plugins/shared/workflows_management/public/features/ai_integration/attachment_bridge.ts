/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser';
import { isToolUiEvent } from '@kbn/agent-builder-common';
import { isConversationIdSetEvent } from '@kbn/agent-builder-common/chat/events';
import type { monaco } from '@kbn/monaco';
import { WORKFLOW_YAML_CHANGED_EVENT } from '@kbn/workflows/common/constants';
import type { ProposalTracker } from './proposal_tracker';
import type { ProposalManager } from './proposed_changes';

export interface WorkflowYamlChangedPayload {
  proposalId: string;
  beforeYaml: string;
  afterYaml: string;
  workflowId?: string;
  /** Stable per-editor id; the bridge drops payloads whose id doesn't match. */
  attachmentId?: string;
  name?: string;
  attachmentVersion?: number;
  toolId?: string;
}

export const baseProposalId = (hunkId: string): string => {
  const sep = hunkId.indexOf('::');
  return sep === -1 ? hunkId : hunkId.substring(0, sep);
};

/**
 * Bridge that subscribes to agent builder chat events and dispatches
 * workflow YAML changes to the Monaco ProposalManager.
 *
 * Listens for `workflow:yaml_changed` ToolUiEvents emitted by server-side
 * edit tools. When multiple events arrive in sequence, existing proposals
 * are reverted first (restoring the model to its pre-proposal state) so
 * that the new diff is computed against the user's original content and
 * applied with correct line coordinates.
 */
export class AttachmentBridge {
  private static readonly PROCESSED_PROPOSALS_CAP = 500;

  private subscription: Subscription | null = null;
  private proposalManager: ProposalManager | null = null;
  private tracker: ProposalTracker | null = null;
  private editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null> | null =
    null;
  private processedProposals = new Set<string>();
  private onError: (err: unknown) => void = () => {};
  private onProposalReceived:
    | ((params: { proposalId: string; toolId: string; workflowId?: string }) => void)
    | undefined;
  private attachmentId: string | undefined;
  private workflowId: string | undefined;
  private conversationId: string | undefined;
  private broadSubscription: Subscription | null = null;
  private getChatEvents$: ((conversationId: string) => Observable<BrowserChatEvent>) | undefined;

  start(
    chat$: Observable<BrowserChatEvent>,
    proposalManager: ProposalManager,
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
    tracker: ProposalTracker,
    options?: {
      onError?: (err: unknown) => void;
      attachmentId?: string;
      /** Saved workflow id, or undefined on the `/workflows/create` route. */
      workflowId?: string;
      /**
       * Per-conversation stream factory. Once `conversation_id_set` arrives on
       * the broad `chat$`, we switch to `getChatEvents$(id)` so events from
       * other conversations can't leak in.
       */
      getChatEvents$?: (conversationId: string) => Observable<BrowserChatEvent>;
      onProposalReceived?: (params: {
        proposalId: string;
        toolId: string;
        workflowId?: string;
      }) => void;
    }
  ): void {
    this.proposalManager = proposalManager;
    this.editorRef = editorRef;
    this.tracker = tracker;
    this.onError = options?.onError ?? (() => {});
    this.onProposalReceived = options?.onProposalReceived;
    this.attachmentId = options?.attachmentId;
    this.workflowId = options?.workflowId;
    this.getChatEvents$ = options?.getChatEvents$;

    this.broadSubscription = chat$.subscribe((event) => {
      if (isConversationIdSetEvent(event)) {
        this.onConversationIdKnown(event.data.conversation_id);
        return;
      }
      // Fallback for callers that don't wire `getChatEvents$` — legacy path.
      if (!this.getChatEvents$ && isToolUiEvent(event, WORKFLOW_YAML_CHANGED_EVENT)) {
        try {
          this.handleYamlChanged(event.data.data as WorkflowYamlChangedPayload);
        } catch (err) {
          this.onError(err);
        }
      }
    });
  }

  private onConversationIdKnown(conversationId: string): void {
    if (this.conversationId === conversationId) return;
    this.conversationId = conversationId;
    if (!this.getChatEvents$) return;

    this.subscription?.unsubscribe();
    this.subscription = this.getChatEvents$(conversationId).subscribe((event) => {
      if (isToolUiEvent(event, WORKFLOW_YAML_CHANGED_EVENT)) {
        try {
          this.handleYamlChanged(event.data.data as WorkflowYamlChangedPayload);
        } catch (err) {
          this.onError(err);
        }
      }
    });
  }

  /**
   * Inject a simulated YAML change for testing purposes. Creates a
   * workflow:yaml_changed payload from the current model content and
   * processes it through the same pipeline as real LLM tool responses.
   */
  injectYamlChange(afterYaml: string): void {
    const editor = this.editorRef?.current;
    const model = editor?.getModel();
    if (!model) return;

    this.handleYamlChanged({
      proposalId: `simulated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      beforeYaml: model.getValue(),
      afterYaml,
      attachmentId: this.attachmentId,
    });
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.broadSubscription?.unsubscribe();
    this.broadSubscription = null;
    this.proposalManager = null;
    this.tracker = null;
    this.editorRef = null;
    this.processedProposals.clear();
    this.attachmentId = undefined;
    this.workflowId = undefined;
    this.conversationId = undefined;
    this.getChatEvents$ = undefined;
  }

  private handleYamlChanged(payload: WorkflowYamlChangedPayload): void {
    const manager = this.proposalManager;
    if (!manager || !this.tracker) return;

    const { proposalId, beforeYaml, afterYaml, attachmentVersion, workflowId, toolId } = payload;

    // Secondary guard on top of the per-conversation scope: even within one
    // conversation, a payload for a different saved workflow must be dropped.
    if (this.workflowId) {
      const payloadAttachmentId = payload.attachmentId ?? workflowId;
      if (payloadAttachmentId && payloadAttachmentId !== this.attachmentId) return;
    } else if (workflowId && workflowId !== this.attachmentId) {
      return;
    }

    if (this.processedProposals.has(proposalId)) return;
    if (this.processedProposals.size >= AttachmentBridge.PROCESSED_PROPOSALS_CAP) {
      this.processedProposals.clear();
    }
    this.processedProposals.add(proposalId);

    const resolvedToolId = toolId ?? 'unknown';

    this.tracker.setRecord({
      proposalId,
      status: 'pending',
      beforeYaml,
      afterYaml,
      toolId: resolvedToolId,
      attachmentVersion: attachmentVersion ?? 0,
    });

    manager.applyAfterYaml(afterYaml);

    this.onProposalReceived?.({
      proposalId,
      toolId: resolvedToolId,
      workflowId,
    });
  }
}
