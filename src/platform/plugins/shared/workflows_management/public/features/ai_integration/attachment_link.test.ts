/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { findLinkedWorkflowAttachmentId, needsOriginLink } from './attachment_link';

const workflowAttachment = (
  id: string,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment =>
  ({
    id,
    type: WORKFLOW_YAML_ATTACHMENT_TYPE,
    versions: [],
    ...overrides,
  } as unknown as VersionedAttachment);

const otherAttachment = (id: string): VersionedAttachment =>
  ({ id, type: 'screen_context', versions: [] } as unknown as VersionedAttachment);

describe('findLinkedWorkflowAttachmentId', () => {
  it('returns undefined when the conversation has no attachments', () => {
    expect(
      findLinkedWorkflowAttachmentId({ attachments: undefined, attachmentId: 'workflow-a' })
    ).toBeUndefined();
  });

  it('returns undefined when the conversation holds no workflow attachment', () => {
    expect(
      findLinkedWorkflowAttachmentId({
        attachments: [otherAttachment('screen-context')],
        attachmentId: 'workflow-a',
      })
    ).toBeUndefined();
  });

  it('prefers an attachment whose id already matches this session', () => {
    expect(
      findLinkedWorkflowAttachmentId({
        attachments: [workflowAttachment('draft-uuid'), workflowAttachment('workflow-a')],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })
    ).toBe('workflow-a');
  });

  it('matches the draft attachment by origin after the first save', () => {
    // The editor would mint `workflow-a`, but the conversation already holds
    // the create session's attachment linked to that workflow.
    expect(
      findLinkedWorkflowAttachmentId({
        attachments: [workflowAttachment('draft-uuid', { origin: 'workflow-a' })],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })
    ).toBe('draft-uuid');
  });

  it('matches the carried draft attachment before its origin is set', () => {
    expect(
      findLinkedWorkflowAttachmentId({
        attachments: [workflowAttachment('draft-uuid')],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
        carriedAttachmentId: 'draft-uuid',
      })
    ).toBe('draft-uuid');
  });

  it('ignores a workflow attachment linked to a different workflow', () => {
    expect(
      findLinkedWorkflowAttachmentId({
        attachments: [workflowAttachment('draft-uuid', { origin: 'workflow-b' })],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })
    ).toBeUndefined();
  });

  it('ignores a deleted attachment', () => {
    expect(
      findLinkedWorkflowAttachmentId({
        attachments: [workflowAttachment('draft-uuid', { origin: 'workflow-a', active: false })],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })
    ).toBeUndefined();
  });
});

describe('needsOriginLink', () => {
  it('is true for an attachment with no origin', () => {
    expect(
      needsOriginLink({
        attachments: [workflowAttachment('draft-uuid')],
        attachmentId: 'draft-uuid',
        workflowId: 'workflow-a',
      })
    ).toBe(true);
  });

  it('is false once the origin points at the workflow', () => {
    expect(
      needsOriginLink({
        attachments: [workflowAttachment('draft-uuid', { origin: 'workflow-a' })],
        attachmentId: 'draft-uuid',
        workflowId: 'workflow-a',
      })
    ).toBe(false);
  });

  it('is false when the attachment is not in the conversation yet', () => {
    expect(
      needsOriginLink({
        attachments: [],
        attachmentId: 'draft-uuid',
        workflowId: 'workflow-a',
      })
    ).toBe(false);
  });
});
