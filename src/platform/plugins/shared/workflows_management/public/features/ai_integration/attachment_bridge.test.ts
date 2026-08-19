/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser';
import { ChatEventType } from '@kbn/agent-builder-common';
import { WORKFLOW_YAML_CHANGED_EVENT } from '@kbn/workflows/common/constants';
import { AttachmentBridge, baseProposalId } from './attachment_bridge';
import { ProposalTracker } from './proposal_tracker';
import type { ProposalManager } from './proposed_changes';

describe('baseProposalId', () => {
  it('strips the hunk suffix from a suffixed ID', () => {
    expect(baseProposalId('change-timezone::0')).toBe('change-timezone');
    expect(baseProposalId('change-timezone::1')).toBe('change-timezone');
    expect(baseProposalId('my-proposal::42')).toBe('my-proposal');
  });

  it('returns the original ID when there is no suffix', () => {
    expect(baseProposalId('change-timezone')).toBe('change-timezone');
    expect(baseProposalId('simple-id')).toBe('simple-id');
  });

  it('handles empty string', () => {
    expect(baseProposalId('')).toBe('');
  });
});

const makeYamlChangedEvent = (payload: Record<string, unknown>): BrowserChatEvent =>
  ({
    type: ChatEventType.toolUi,
    data: {
      tool_id: 'some-tool',
      tool_call_id: 'call-1',
      custom_event: WORKFLOW_YAML_CHANGED_EVENT,
      data: payload,
    },
  } as unknown as BrowserChatEvent);

const createMockEditor = (initialValue: string) => {
  let content = initialValue;
  return {
    getModel: () => ({
      getValue: () => content,
      _setValue: (v: string) => {
        content = v;
      },
    }),
  } as unknown as import('@kbn/monaco').monaco.editor.IStandaloneCodeEditor;
};

const createMockProposalManager = () => {
  const manager = {
    hasPendingProposals: jest.fn(() => false),
    applyAfterYaml: jest.fn(),
    getDiffHunks: jest.fn(() => []),
  } as unknown as ProposalManager;
  return { manager };
};

describe('AttachmentBridge: workflow navigation', () => {
  const WORKFLOW_A_YAML = [
    "version: '1'",
    'name: Workflow A',
    'description: First workflow',
    '',
    'steps:',
    '  - name: step1',
    '    type: console',
    '    with:',
    '      message: hello from A',
  ].join('\n');

  const WORKFLOW_B_YAML = [
    "version: '1'",
    'name: Workflow B',
    'description: Second workflow',
    '',
    'steps:',
    '  - name: stepX',
    '    type: http',
    '    with:',
    '      url: https://example.com',
  ].join('\n');

  it('event for previous workflow arriving after navigation should not corrupt the current editor', () => {
    const chat$ = new Subject<BrowserChatEvent>();

    const editedWorkflowAYaml = WORKFLOW_A_YAML.replace(
      'description: First workflow',
      'description: EDITED first workflow'
    );

    const editorA = createMockEditor(WORKFLOW_A_YAML);
    const editorRefA = { current: editorA };
    const trackerA = new ProposalTracker();
    const { manager: managerA } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, managerA, editorRefA, trackerA, {
      attachmentId: 'workflow-a',
      workflowId: 'workflow-a',
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'proposal-a',
        beforeYaml: WORKFLOW_A_YAML,
        afterYaml: editedWorkflowAYaml,
        attachmentId: 'workflow-a',
      })
    );

    expect(managerA.applyAfterYaml).toHaveBeenCalledWith(editedWorkflowAYaml);

    bridge.stop();

    const editedWorkflowBYaml = WORKFLOW_B_YAML.replace(
      'description: Second workflow',
      'description: EDITED second workflow'
    );

    const editorB = createMockEditor(WORKFLOW_B_YAML);
    const editorRefB = { current: editorB };
    const trackerB = new ProposalTracker();
    const { manager: managerB } = createMockProposalManager();

    bridge.start(chat$, managerB, editorRefB, trackerB, {
      attachmentId: 'workflow-b',
      workflowId: 'workflow-b',
    });

    const secondEditOnA = WORKFLOW_A_YAML.replace(
      'description: First workflow',
      'description: Another edit on A'
    );
    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'proposal-a-late',
        beforeYaml: editedWorkflowAYaml,
        afterYaml: secondEditOnA,
        attachmentId: 'workflow-a',
      })
    );

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'proposal-b',
        beforeYaml: WORKFLOW_B_YAML,
        afterYaml: editedWorkflowBYaml,
        attachmentId: 'workflow-b',
      })
    );

    expect(managerB.applyAfterYaml).toHaveBeenCalledTimes(1);
    expect(managerB.applyAfterYaml).toHaveBeenCalledWith(editedWorkflowBYaml);

    bridge.stop();
  });
});

describe('AttachmentBridge: onProposalReceived workflowId', () => {
  it('passes the event workflowId through to onProposalReceived (unset when create-time)', () => {
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor('yaml: content');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const onProposalReceived = jest.fn();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      attachmentId: 'attachment-uuid-not-a-real-workflow-id',
      onProposalReceived,
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p1',
        beforeYaml: 'yaml: content',
        afterYaml: 'yaml: changed',
        attachmentId: 'attachment-uuid-not-a-real-workflow-id',
        toolId: 'some.tool',
      })
    );

    expect(onProposalReceived).toHaveBeenCalledTimes(1);
    expect(onProposalReceived).toHaveBeenCalledWith({
      proposalId: 'p1',
      toolId: 'some.tool',
      workflowId: undefined,
    });

    bridge.stop();
  });

  it('passes real workflowId from event payload when present', () => {
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor('yaml: content');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const onProposalReceived = jest.fn();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      attachmentId: 'real-workflow-id',
      workflowId: 'real-workflow-id',
      onProposalReceived,
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p1',
        beforeYaml: 'yaml: content',
        afterYaml: 'yaml: changed',
        attachmentId: 'real-workflow-id',
        workflowId: 'real-workflow-id',
        toolId: 'some.tool',
      })
    );

    expect(onProposalReceived).toHaveBeenCalledWith({
      proposalId: 'p1',
      toolId: 'some.tool',
      workflowId: 'real-workflow-id',
    });

    bridge.stop();
  });

  it('scopes edits by attachmentId even when payload workflowId is undefined (create-session)', () => {
    // Simulates: user starts chat on /workflows/create (unsaved UUID X), navigates
    // to workflow B before the agent replies. B's bridge must drop the late event
    // whose attachmentId is X, not apply it to B.
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor('yaml: on-B');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      attachmentId: 'workflow-B',
      workflowId: 'workflow-B',
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'late-from-create',
        beforeYaml: 'yaml: on-create',
        afterYaml: 'yaml: from-agent',
        attachmentId: 'unsaved-uuid-X',
        // no workflowId — create session had no saved id yet
      })
    );

    expect(manager.applyAfterYaml).not.toHaveBeenCalled();

    bridge.stop();
  });

  it('accepts the first server-minted attachmentId on a create-session bridge', () => {
    // On /workflows/create the very first generate_workflow call omits
    // attachmentId, so the server mints a fresh one and echoes it back. The
    // client's unsavedWorkflowIdRef doesn't match, but the event has no
    // saved workflowId, so it belongs to this create session and must apply.
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor('yaml: default');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      attachmentId: 'client-unsaved-uuid',
      // workflowId omitted — create-session bridge
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'first-gen',
        beforeYaml: 'yaml: default',
        afterYaml: 'yaml: from-agent',
        attachmentId: 'server-minted-uuid',
        // no workflowId — first-generation create-session event
      })
    );

    expect(manager.applyAfterYaml).toHaveBeenCalledWith('yaml: from-agent');

    bridge.stop();
  });

  it('scopes to its own conversation via getChatEvents$ and ignores broad-stream workflow events after conversation_id is known', () => {
    // With per-conversation scoping (getChatEvents$), events from other
    // conversations cannot reach this bridge — regardless of ordering. Covers
    // both "B receives its own event first" and "B receives A's late event
    // first" scenarios of the create→create leak the bot flagged.
    const chat$ = new Subject<BrowserChatEvent>();
    const perConversation$ = new Map<string, Subject<BrowserChatEvent>>();
    const getChatEvents$ = jest.fn((conversationId: string) => {
      let s = perConversation$.get(conversationId);
      if (!s) {
        s = new Subject<BrowserChatEvent>();
        perConversation$.set(conversationId, s);
      }
      return s.asObservable();
    });

    const editor = createMockEditor('yaml: on-B');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      attachmentId: 'client-B-unsaved-uuid',
      getChatEvents$,
    });

    // conversation_id_set for B lands on the broad chat$ → bridge switches to
    // getChatEvents$('conv-B') for workflow events.
    chat$.next({
      type: ChatEventType.conversationIdSet,
      data: { conversation_id: 'conv-B' },
    } as unknown as BrowserChatEvent);

    // A stale workflow event on the broad chat$ (from a previous session A)
    // must NOT be picked up — the bridge no longer listens for workflow
    // events on chat$ once scoped.
    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'A-late',
        beforeYaml: 'yaml: on-A',
        afterYaml: 'yaml: from-A-agent',
        attachmentId: 'server-A-id',
      })
    );
    expect(manager.applyAfterYaml).not.toHaveBeenCalled();

    // B's own event on the scoped stream is applied.
    perConversation$.get('conv-B')!.next(
      makeYamlChangedEvent({
        proposalId: 'B-first',
        beforeYaml: 'yaml: on-B',
        afterYaml: 'yaml: from-B-agent',
        attachmentId: 'server-B-id',
      })
    );
    expect(manager.applyAfterYaml).toHaveBeenLastCalledWith('yaml: from-B-agent');

    bridge.stop();
  });

  it('drops workflow events arriving on the broad chat$ before conversation_id_set (deterministic stale-event guard)', () => {
    // Reverse ordering of the create→create repro: A's late event arrives on
    // chat$ *before* our conversation_id_set. Since our conversation hasn't
    // started yet, any workflow:yaml_changed must be stale — drop.
    const chat$ = new Subject<BrowserChatEvent>();
    const scoped$ = new Subject<BrowserChatEvent>();
    const getChatEvents$ = jest.fn(() => scoped$.asObservable());
    const editor = createMockEditor('yaml: on-B');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      attachmentId: 'client-B-unsaved-uuid',
      getChatEvents$,
    });

    // A's late event arrives on the broad chat$ before we've seen our
    // conversation_id_set — must be ignored.
    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'A-late-first',
        beforeYaml: 'yaml: on-A',
        afterYaml: 'yaml: from-A-agent',
        attachmentId: 'server-A-id',
      })
    );

    expect(manager.applyAfterYaml).not.toHaveBeenCalled();

    bridge.stop();
  });

  it('drops a late event from a previous saved workflow when the user has moved to /create', () => {
    // User was on saved workflow A, opened a conversation, navigated to
    // /workflows/create. Late event from A lands on the new create-session
    // bridge — must be dropped, otherwise A's edits mutate the fresh /create.
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor('yaml: default');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      attachmentId: 'new-unsaved-uuid',
      // no workflowId
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'late-from-A',
        beforeYaml: 'yaml: on-A',
        afterYaml: 'yaml: A-edit',
        attachmentId: 'workflow-A',
        workflowId: 'workflow-A',
      })
    );

    expect(manager.applyAfterYaml).not.toHaveBeenCalled();

    bridge.stop();
  });

  it('falls back to matching by workflowId when the event has no attachmentId (legacy)', () => {
    // Older servers may emit events without attachmentId; the bridge falls back
    // to matching by workflowId so the previously-working saved→saved guard
    // does not regress.
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor('yaml: on-B');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, { attachmentId: 'workflow-B' });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'late-legacy',
        beforeYaml: 'yaml: on-A',
        afterYaml: 'yaml: from-agent',
        workflowId: 'workflow-A',
      })
    );

    expect(manager.applyAfterYaml).not.toHaveBeenCalled();

    bridge.stop();
  });
});

describe('AttachmentBridge: sequential events delegate to applyAfterYaml', () => {
  const ORIGINAL_YAML = [
    "version: '1'",
    'name: My Workflow',
    'description: original description',
    '',
    'enabled: true',
    '',
    'triggers:',
    '  - type: manual',
    '',
    'steps:',
    '  - name: step1',
    '    type: console',
    '    with:',
    '      message: hello',
  ].join('\n');

  const V1_YAML = ORIGINAL_YAML.replace(
    'description: original description',
    'description: updated by tool 1'
  );

  const V2_YAML = V1_YAML.replace('enabled: true', 'enabled: false');

  it('second sequential event calls applyAfterYaml with V2', () => {
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor(ORIGINAL_YAML);
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker);

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p1',
        beforeYaml: ORIGINAL_YAML,
        afterYaml: V1_YAML,
        attachmentVersion: 1,
      })
    );

    expect(manager.applyAfterYaml).toHaveBeenCalledWith(V1_YAML);

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p2',
        beforeYaml: V1_YAML,
        afterYaml: V2_YAML,
        attachmentVersion: 2,
      })
    );

    expect(manager.applyAfterYaml).toHaveBeenCalledTimes(2);
    expect(manager.applyAfterYaml).toHaveBeenLastCalledWith(V2_YAML);

    bridge.stop();
  });

  it('tracker records are set for each event', () => {
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor(ORIGINAL_YAML);
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker);

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p1',
        beforeYaml: ORIGINAL_YAML,
        afterYaml: V1_YAML,
        attachmentVersion: 1,
      })
    );

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p2',
        beforeYaml: V1_YAML,
        afterYaml: V2_YAML,
        attachmentVersion: 2,
      })
    );

    expect(tracker.getRecord('p1')?.status).toBe('pending');
    expect(tracker.getRecord('p2')?.status).toBe('pending');

    bridge.stop();
  });

  it('after stop/restart, new manager receives applyAfterYaml', () => {
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor(ORIGINAL_YAML);
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker);

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p1',
        beforeYaml: ORIGINAL_YAML,
        afterYaml: V1_YAML,
        attachmentVersion: 1,
      })
    );

    bridge.stop();

    const tracker2 = new ProposalTracker();
    const { manager: manager2 } = createMockProposalManager();
    bridge.start(chat$, manager2, editorRef, tracker2);

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p2',
        beforeYaml: V1_YAML,
        afterYaml: V2_YAML,
        attachmentVersion: 2,
      })
    );

    expect(manager2.applyAfterYaml).toHaveBeenCalledTimes(1);
    expect(manager2.applyAfterYaml).toHaveBeenCalledWith(V2_YAML);

    bridge.stop();
  });
});
