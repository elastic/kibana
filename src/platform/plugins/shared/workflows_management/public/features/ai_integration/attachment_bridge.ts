/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diffLines } from 'diff';
import type { Observable, Subscription } from 'rxjs';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser';
import { isToolUiEvent } from '@kbn/agent-builder-common';
import type { monaco } from '@kbn/monaco';
import type { ProposalTracker } from './proposal_tracker';
import type { ProposalManager, ProposedChange } from './proposed_changes';
import {
  WORKFLOW_YAML_CHANGED_EVENT,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
} from '../../../common/agent_builder/constants';
import { yamlLanguageService } from '../../shared/ui/yaml_editor/yaml_language_service';

export interface WorkflowYamlChangedPayload {
  proposalId: string;
  beforeYaml: string;
  afterYaml: string;
  workflowId?: string;
  name?: string;
  attachmentVersion?: number;
}

export const changeFingerprint = (change: ProposedChange): string =>
  `${change.startLine}:${change.type}:${change.newText}`;

export const baseProposalId = (hunkId: string): string => {
  const sep = hunkId.indexOf('::');
  return sep === -1 ? hunkId : hunkId.substring(0, sep);
};

/**
 * Merge adjacent hunks so that closely related changes (e.g. a replace
 * followed by an insert on the very next line) become a single proposal
 * with one Accept/Decline pill instead of two.
 */
const mergeAdjacentChanges = (changes: ProposedChange[]): ProposedChange[] => {
  if (changes.length <= 1) return changes;

  const result: ProposedChange[] = [{ ...changes[0] }];

  for (let i = 1; i < changes.length; i++) {
    const prev = result[result.length - 1];
    const curr = changes[i];

    const prevOrigEnd =
      prev.type === 'insert' ? prev.startLine : (prev.endLine ?? prev.startLine) + 1;

    if (curr.startLine <= prevOrigEnd) {
      prev.newText += curr.newText;

      if (curr.type !== 'insert') {
        const currEnd = curr.endLine ?? curr.startLine;
        if (prev.type === 'insert') {
          prev.endLine = currEnd;
        } else {
          prev.endLine = Math.max(prev.endLine ?? prev.startLine, currEnd);
        }
        prev.type = prev.newText ? 'replace' : 'delete';
      }
    } else {
      result.push({ ...curr });
    }
  }

  return result;
};

/**
 * Compute ProposedChanges by diffing beforeYaml and afterYaml using the
 * Myers diff algorithm (via the `diff` library). Returns one ProposedChange
 * per contiguous hunk, so non-adjacent edits produce separate proposals
 * that the editor can highlight independently. Adjacent hunks are merged
 * to avoid duplicate Accept/Decline pills.
 */
export const computeChanges = (
  beforeRaw: string,
  afterRaw: string,
  proposalId: string
): ProposedChange[] => {
  if (beforeRaw === afterRaw) return [];

  // eslint-disable-next-line prefer-template
  const normalizeTrailing = (s: string) => s.trimEnd() + '\n';
  const before = normalizeTrailing(beforeRaw);
  const after = normalizeTrailing(afterRaw);

  if (before === after) return [];

  const parts = diffLines(before, after);
  const changes: ProposedChange[] = [];
  let currentLine = 1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const lineCount = part.count ?? 0;

    if (!part.added && !part.removed) {
      currentLine += lineCount;
    } else if (part.removed) {
      const next = parts[i + 1];

      if (next?.added) {
        changes.push({
          proposalId,
          type: 'replace',
          startLine: currentLine,
          endLine: currentLine + lineCount - 1,
          newText: next.value,
        });
        i++;
      } else {
        changes.push({
          proposalId,
          type: 'delete',
          startLine: currentLine,
          endLine: currentLine + lineCount - 1,
          newText: '',
        });
      }
      currentLine += lineCount;
    } else if (part.added) {
      changes.push({
        proposalId,
        type: 'insert',
        startLine: currentLine,
        newText: part.value,
      });
    }
  }

  return mergeAdjacentChanges(changes);
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
    const editor = this.editorRef?.current;
    if (!manager || !editor || !this.tracker) return;

    const model = editor.getModel();
    if (!model) return;

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

    if (manager.hasPendingProposals()) {
      const revertedIds = manager.revertAllSilently();
      const revertedBaseIds = [...new Set(revertedIds.map(baseProposalId))];
      for (const baseId of revertedBaseIds) {
        this.tracker.updateStatus(baseId, 'accepted');
      }
    }

    const declined = this.tracker.getDeclinedFingerprints();
    const currentContent = model.getValue();
    const changes = computeChanges(currentContent, afterYaml, proposalId);

    // Apply bottom-to-top so each proposeChange (which modifies the model)
    // only shifts lines below the current edit, keeping coordinates of
    // earlier (higher) hunks valid.
    for (let i = changes.length - 1; i >= 0; i--) {
      const change = changes[i];
      if (!declined.has(changeFingerprint(change))) {
        const changeEnd = change.endLine ?? change.startLine;
        manager.acceptOverlapping(change.startLine, changeEnd);
        const hunkChange = { ...change, proposalId: `${change.proposalId}::${i}` };
        manager.proposeChange(hunkChange);
      }
    }

    // Multi-hunk applies cause intermediate onDidChangeContent events that
    // can make monaco-yaml's async worker validate stale model states.
    // Re-run validation via the monaco-yaml API which includes a built-in
    // staleness guard (compares model versionId before/after the async call).
    if (changes.length > 1) {
      const monacoYaml = yamlLanguageService.getInstance();
      if (monacoYaml) {
        monacoYaml.update({});
      }
    }
  }
}
