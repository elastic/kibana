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
  attachments: VersionedAttachment[] | undefined;
  /** Attachment id this editor session would use on its own. */
  attachmentId: string;
  /** Saved workflow id, or undefined on the `/workflows/create` route. */
  workflowId?: string;
  /** Create-session attachment id handed over across the first save. */
  carriedAttachmentId?: string;
}

/**
 * Returns the workflow attachment this session must keep writing into, or
 * `undefined` when the conversation holds none. The editor's own id changes
 * when a new workflow is saved, so resolving from the conversation is what
 * keeps one attachment instead of two.
 */
export const findLinkedWorkflowAttachment = ({
  attachments,
  attachmentId,
  workflowId,
  carriedAttachmentId,
}: FindLinkedWorkflowAttachmentParams): VersionedAttachment | undefined => {
  const candidates = (attachments ?? []).filter(
    (attachment) =>
      attachment.type === WORKFLOW_YAML_ATTACHMENT_TYPE && isAttachmentActive(attachment)
  );

  return (
    candidates.find((attachment) => attachment.id === attachmentId) ??
    // Survives a reload, where the handoff state is gone.
    (workflowId ? candidates.find((attachment) => attachment.origin === workflowId) : undefined) ??
    (carriedAttachmentId
      ? candidates.find((attachment) => attachment.id === carriedAttachmentId)
      : undefined)
  );
};
