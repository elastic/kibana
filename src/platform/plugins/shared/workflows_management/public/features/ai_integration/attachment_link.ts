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

export interface FindLinkedWorkflowAttachmentParams {
  /** Conversation-level attachments of the conversation the editor is bound to. */
  attachments: VersionedAttachment[] | undefined;
  /** Attachment id this editor session would mint on its own. */
  attachmentId: string;
  /** Saved workflow id, or undefined on the `/workflows/create` route. */
  workflowId?: string;
  /**
   * Attachment id of the create session that produced `workflowId`, handed over
   * by {@link carryConversationToWorkflow} across the first save.
   */
  carriedAttachmentId?: string;
}

/**
 * Returns the id of the workflow attachment this editor session must keep
 * writing into, or `undefined` when the conversation holds none yet.
 *
 * The editor mints its attachment id from the route: a uuid on
 * `/workflows/create`, the workflow id on a saved workflow. The id therefore
 * changes when the user saves a new workflow, and a session that syncs under
 * the new id adds a second `workflow.yaml` attachment to the same
 * conversation. Resolving the id from the conversation instead keeps one
 * attachment with a growing version list.
 */
export const findLinkedWorkflowAttachmentId = ({
  attachments,
  attachmentId,
  workflowId,
  carriedAttachmentId,
}: FindLinkedWorkflowAttachmentParams): string | undefined => {
  const candidates = (attachments ?? []).filter(
    (attachment) =>
      attachment.type === WORKFLOW_YAML_ATTACHMENT_TYPE && isAttachmentActive(attachment)
  );
  if (candidates.length === 0) return undefined;

  const exact = candidates.find((attachment) => attachment.id === attachmentId);
  if (exact) return exact.id;

  // Set once the create session's attachment has been linked to the saved
  // workflow, so it survives a page reload where the handoff state is gone.
  const byOrigin = workflowId && candidates.find((attachment) => attachment.origin === workflowId);
  if (byOrigin) return byOrigin.id;

  const carried =
    carriedAttachmentId && candidates.find((attachment) => attachment.id === carriedAttachmentId);
  return carried ? carried.id : undefined;
};

/**
 * Returns true when `attachmentId` names an attachment in the conversation that
 * is not yet linked to `workflowId`, so the caller must set its origin.
 */
export const needsOriginLink = ({
  attachments,
  attachmentId,
  workflowId,
}: {
  attachments: VersionedAttachment[] | undefined;
  attachmentId: string;
  workflowId: string;
}): boolean => {
  const attachment = (attachments ?? []).find((candidate) => candidate.id === attachmentId);
  return Boolean(attachment && isAttachmentActive(attachment) && attachment.origin !== workflowId);
};
