/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { isAttachmentActive } from '@kbn/agent-builder-common/attachments';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';

/**
 * Id the editor gives its workflow attachment. Fixed, so saving a workflow
 * cannot move it and leave the editor writing into a second attachment.
 * `screen-context` and `ai-rule-creation` work the same way.
 */
export const WORKFLOW_EDITOR_ATTACHMENT_ID = 'workflow-yaml-editor';

export interface FindLinkedWorkflowAttachmentParams {
  attachments: VersionedAttachment[] | undefined;
  /** Attachment id this editor session would use on its own. */
  attachmentId: string;
  /** Saved workflow id, or undefined on the `/workflows/create` route. */
  workflowId?: string;
}

/**
 * Returns the workflow attachment this session must keep writing into, or
 * `undefined` when the conversation holds none. Once set, the origin identifies
 * the owning workflow. For unowned attachments, the fixed editor id identifies
 * a draft created by the current integration. Legacy sessions may instead have
 * the saved workflow id or an arbitrary create-session id; the latter is safe
 * to reuse only when it is the sole unowned workflow attachment.
 */
export const findLinkedWorkflowAttachment = ({
  attachments,
  attachmentId,
  workflowId,
}: FindLinkedWorkflowAttachmentParams): VersionedAttachment | undefined => {
  const candidates = (attachments ?? []).filter(
    (attachment) =>
      attachment.type === WORKFLOW_YAML_ATTACHMENT_TYPE && isAttachmentActive(attachment)
  );

  const linkedByOrigin = candidates.find(
    ({ origin }) => workflowId !== undefined && origin === workflowId
  );
  if (linkedByOrigin) return linkedByOrigin;

  const linkedByAttachmentId = candidates.find(
    ({ id, origin }) => origin === undefined && id === attachmentId
  );
  if (linkedByAttachmentId) return linkedByAttachmentId;

  if (workflowId === undefined) return undefined;

  const legacySavedWorkflowAttachment = candidates.find(
    ({ id, origin }) => origin === undefined && id === workflowId
  );
  if (legacySavedWorkflowAttachment) return legacySavedWorkflowAttachment;

  const unownedCandidates = candidates.filter(({ origin }) => origin === undefined);
  return unownedCandidates.length === 1 ? unownedCandidates[0] : undefined;
};
