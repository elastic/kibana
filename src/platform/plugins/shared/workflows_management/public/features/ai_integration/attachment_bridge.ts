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
import type { monaco } from '@kbn/monaco';
import type { ProposalTracker } from './proposal_tracker';
import type { ProposalManager } from './proposed_changes';
import {
  WORKFLOW_YAML_CHANGED_EVENT,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
} from '../../../common/agent_builder/constants';

export interface WorkflowYamlChangedPayload {
  proposalId: string;
  beforeYaml: string;
  afterYaml: string;
  workflowId?: string;
  name?: string;
  attachmentVersion?: number;
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
  private workflowId: string | undefined;

  start(
    chat$: Observable<BrowserChatEvent>,
    proposalManager: ProposalManager,
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
    tracker: ProposalTracker,
    options?: { onError?: (err: unknown) => void; workflowId?: string }
  ): void {
    this.proposalManager = proposalManager;
    this.editorRef = editorRef;
    this.tracker = tracker;
    this.onError = options?.onError ?? (() => {});
    this.workflowId = options?.workflowId;

    this.subscription = chat$.subscribe((event) => {
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
      workflowId: this.workflowId,
    });
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.proposalManager = null;
    this.tracker = null;
    this.editorRef = null;
    this.processedProposals.clear();
    this.workflowId = undefined;
  }

  private handleYamlChanged(payload: WorkflowYamlChangedPayload): void {
    const manager = this.proposalManager;
    if (!manager || !this.tracker) return;

    const { proposalId, beforeYaml, afterYaml, attachmentVersion, workflowId } = payload;

    if (this.workflowId && workflowId && workflowId !== this.workflowId) return;

    if (this.processedProposals.has(proposalId)) return;
    if (this.processedProposals.size >= AttachmentBridge.PROCESSED_PROPOSALS_CAP) {
      this.processedProposals.clear();
    }
    this.processedProposals.add(proposalId);

    this.tracker.setRecord({
      proposalId,
      status: 'pending',
      beforeYaml,
      afterYaml,
      toolId: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
      attachmentVersion: attachmentVersion ?? 0,
    });

    manager.applyAfterYaml(afterYaml);
  }
}
