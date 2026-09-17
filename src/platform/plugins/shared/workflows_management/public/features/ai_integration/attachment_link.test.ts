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
import { findLinkedWorkflowAttachment, WORKFLOW_EDITOR_ATTACHMENT_ID } from './attachment_link';

const workflowAttachment = (
  id: string,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id,
  type: WORKFLOW_YAML_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  ...overrides,
});

const screenContextAttachment = (): VersionedAttachment => ({
  id: 'screen-context',
  type: 'screen_context',
  versions: [],
  current_version: 1,
});

describe('findLinkedWorkflowAttachment', () => {
  it('returns undefined when the conversation has no attachments', () => {
    expect(
      findLinkedWorkflowAttachment({ attachments: undefined, attachmentId: 'workflow-a' })
    ).toBeUndefined();
  });

  it('returns undefined when the conversation holds no workflow attachment', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [screenContextAttachment()],
        attachmentId: 'workflow-a',
      })
    ).toBeUndefined();
  });

  it('prefers an attachment whose id already matches this session', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [workflowAttachment('draft-uuid'), workflowAttachment('workflow-a')],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })?.id
    ).toBe('workflow-a');
  });

  it('matches the draft attachment by origin after the first save', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [workflowAttachment('draft-uuid', { origin: 'workflow-a' })],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })?.id
    ).toBe('draft-uuid');
  });

  it('matches the sole unowned legacy create-session attachment', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [workflowAttachment('legacy-draft-uuid')],
        attachmentId: WORKFLOW_EDITOR_ATTACHMENT_ID,
        workflowId: 'workflow-a',
      })?.id
    ).toBe('legacy-draft-uuid');
  });

  it('does not guess between multiple unowned legacy attachments', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [workflowAttachment('legacy-a'), workflowAttachment('legacy-b')],
        attachmentId: WORKFLOW_EDITOR_ATTACHMENT_ID,
        workflowId: 'workflow-a',
      })
    ).toBeUndefined();
  });

  it('ignores a workflow attachment linked to a different workflow', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [workflowAttachment('draft-uuid', { origin: 'workflow-b' })],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })
    ).toBeUndefined();
  });

  it('ignores the fixed-id attachment when it is linked to a different workflow', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [workflowAttachment(WORKFLOW_EDITOR_ATTACHMENT_ID, { origin: 'workflow-b' })],
        attachmentId: WORKFLOW_EDITOR_ATTACHMENT_ID,
        workflowId: 'workflow-a',
      })
    ).toBeUndefined();
  });

  it('ignores a deleted attachment', () => {
    expect(
      findLinkedWorkflowAttachment({
        attachments: [workflowAttachment('draft-uuid', { origin: 'workflow-a', active: false })],
        attachmentId: 'workflow-a',
        workflowId: 'workflow-a',
      })
    ).toBeUndefined();
  });
});
