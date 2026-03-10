/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import type { monaco } from '@kbn/monaco';
import type { ProposalManager, ProposedChange } from './proposed_changes';
import type { AgentBuilderChatEvent } from '../../types';

const WORKFLOW_YAML_DIFF_TYPE = 'workflow.yaml.diff';

interface WorkflowYamlDiffData {
  beforeYaml: string;
  afterYaml: string;
  proposalId: string;
  status: 'pending' | 'accepted' | 'declined';
  workflowId?: string;
  name?: string;
}

interface VersionedAttachment {
  id: string;
  type: string;
  versions: Array<{
    version: number;
    data: unknown;
  }>;
}

interface RoundCompleteEventData {
  round: unknown;
  attachments?: VersionedAttachment[];
}

const isRoundCompleteEvent = (
  event: AgentBuilderChatEvent
): event is AgentBuilderChatEvent & { data: RoundCompleteEventData } => {
  return event.type === 'round_complete';
};

const extractPendingDiffs = (attachments: VersionedAttachment[]): WorkflowYamlDiffData[] => {
  return attachments
    .filter((a) => a.type === WORKFLOW_YAML_DIFF_TYPE)
    .map((a) => {
      const latestVersion = a.versions[a.versions.length - 1];
      return latestVersion?.data as WorkflowYamlDiffData;
    })
    .filter((data): data is WorkflowYamlDiffData => data != null && data.status === 'pending');
};

/**
 * Compute a minimal ProposedChange by comparing beforeYaml and afterYaml
 * line-by-line. Finds the common prefix/suffix to narrow the change to only
 * the lines that actually differ, producing a single contained hunk.
 */
export const computeMinimalChange = (
  beforeYaml: string,
  afterYaml: string,
  proposalId: string
): ProposedChange | null => {
  const beforeLines = beforeYaml.split('\n');
  const afterLines = afterYaml.split('\n');

  let prefixLen = 0;
  const minLen = Math.min(beforeLines.length, afterLines.length);
  while (prefixLen < minLen && beforeLines[prefixLen] === afterLines[prefixLen]) {
    prefixLen++;
  }

  if (prefixLen === beforeLines.length && prefixLen === afterLines.length) {
    return null;
  }

  let suffixLen = 0;
  const maxSuffix = minLen - prefixLen;
  while (
    suffixLen < maxSuffix &&
    beforeLines[beforeLines.length - 1 - suffixLen] ===
      afterLines[afterLines.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const beforeStart = prefixLen;
  const beforeEnd = beforeLines.length - suffixLen;
  const afterStart = prefixLen;
  const afterEnd = afterLines.length - suffixLen;

  const changedBefore = beforeLines.slice(beforeStart, beforeEnd);
  const changedAfter = afterLines.slice(afterStart, afterEnd);

  const startLine = prefixLen + 1;

  if (changedBefore.length === 0 && changedAfter.length > 0) {
    return {
      proposalId,
      type: 'insert',
      startLine,
      newText: `${changedAfter.join('\n')}\n`,
    };
  }

  if (changedBefore.length > 0 && changedAfter.length === 0) {
    return {
      proposalId,
      type: 'delete',
      startLine,
      endLine: beforeEnd,
      newText: '',
    };
  }

  return {
    proposalId,
    type: 'replace',
    startLine,
    endLine: beforeEnd,
    newText: `${changedAfter.join('\n')}\n`,
  };
};

/**
 * Bridge that subscribes to agent builder chat events and dispatches
 * `workflow.yaml.diff` attachments to the Monaco ProposalManager.
 *
 * When the server emits a diff attachment with `status: 'pending'`, the bridge
 * computes a minimal line-level diff and proposes only the changed region so
 * the user sees a contained, surgical diff in the editor.
 */
export class AttachmentBridge {
  private subscription: Subscription | null = null;
  private proposalManager: ProposalManager | null = null;
  private editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null> | null =
    null;
  private processedProposals = new Set<string>();

  start(
    chat$: Observable<AgentBuilderChatEvent>,
    proposalManager: ProposalManager,
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>
  ): void {
    this.proposalManager = proposalManager;
    this.editorRef = editorRef;

    this.subscription = chat$.subscribe((event) => {
      if (isRoundCompleteEvent(event) && event.data.attachments) {
        this.handleAttachments(event.data.attachments);
      }
    });
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.proposalManager = null;
    this.editorRef = null;
    this.processedProposals.clear();
  }

  private handleAttachments(attachments: VersionedAttachment[]): void {
    const manager = this.proposalManager;
    const editor = this.editorRef?.current;
    if (!manager || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const pendingDiffs = extractPendingDiffs(attachments);

    for (const diff of pendingDiffs) {
      if (!this.processedProposals.has(diff.proposalId)) {
        this.processedProposals.add(diff.proposalId);

        const currentContent = model.getValue();
        const change = computeMinimalChange(currentContent, diff.afterYaml, diff.proposalId);

        if (change) {
          manager.proposeChange(change);
        }
      }
    }
  }
}
