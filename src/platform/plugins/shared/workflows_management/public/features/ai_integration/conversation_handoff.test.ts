/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { carryConversationToWorkflow, setLastCreateAttachmentId } from './conversation_handoff';

describe('conversation_handoff', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLastCreateAttachmentId(undefined);
  });

  it('is a no-op when no create attachment was registered', () => {
    window.localStorage.setItem(
      'agentBuilder.lastConversation.workflow-editor:unrelated.default',
      'conv-x'
    );

    carryConversationToWorkflow('saved-workflow-1');

    expect(
      window.localStorage.getItem('agentBuilder.lastConversation.workflow-editor:unrelated.default')
    ).toBe('conv-x');
  });

  it('carries persisted conversation ids from the create session tag to the saved workflow tag', () => {
    setLastCreateAttachmentId('unsaved-uuid-A');
    window.localStorage.setItem(
      'agentBuilder.lastConversation.workflow-editor:unsaved-uuid-A.default',
      'conv-1'
    );
    window.localStorage.setItem(
      'agentBuilder.lastConversation.workflow-editor:unsaved-uuid-A.platform.core.general',
      'conv-2'
    );

    carryConversationToWorkflow('saved-wf-1');

    expect(
      window.localStorage.getItem(
        'agentBuilder.lastConversation.workflow-editor:saved-wf-1.default'
      )
    ).toBe('conv-1');
    expect(
      window.localStorage.getItem(
        'agentBuilder.lastConversation.workflow-editor:saved-wf-1.platform.core.general'
      )
    ).toBe('conv-2');
    // Source keys removed so no ghost sessions linger
    expect(
      window.localStorage.getItem(
        'agentBuilder.lastConversation.workflow-editor:unsaved-uuid-A.default'
      )
    ).toBeNull();
  });

  it('single-shot: a second carry after consume does not migrate again', () => {
    setLastCreateAttachmentId('unsaved-uuid-A');
    window.localStorage.setItem(
      'agentBuilder.lastConversation.workflow-editor:unsaved-uuid-A.default',
      'conv-1'
    );

    carryConversationToWorkflow('saved-wf-1');
    carryConversationToWorkflow('saved-wf-2');

    expect(
      window.localStorage.getItem(
        'agentBuilder.lastConversation.workflow-editor:saved-wf-2.default'
      )
    ).toBeNull();
  });

  it('is a no-op when source and target ids match (e.g. already-saved workflow re-save)', () => {
    setLastCreateAttachmentId('saved-wf-1');
    window.localStorage.setItem(
      'agentBuilder.lastConversation.workflow-editor:saved-wf-1.default',
      'conv-1'
    );

    carryConversationToWorkflow('saved-wf-1');

    expect(
      window.localStorage.getItem(
        'agentBuilder.lastConversation.workflow-editor:saved-wf-1.default'
      )
    ).toBe('conv-1');
  });

  it('does not touch localStorage keys outside the create tag prefix', () => {
    setLastCreateAttachmentId('unsaved-uuid-A');
    window.localStorage.setItem('unrelated.key', 'stays');
    window.localStorage.setItem(
      'agentBuilder.lastConversation.workflow-editor:unsaved-uuid-A.default',
      'conv-1'
    );

    carryConversationToWorkflow('saved-wf-1');

    expect(window.localStorage.getItem('unrelated.key')).toBe('stays');
  });
});
