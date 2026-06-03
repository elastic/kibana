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
    bridge.start(chat$, managerA, editorRefA, trackerA, { workflowId: 'workflow-a' });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'proposal-a',
        beforeYaml: WORKFLOW_A_YAML,
        afterYaml: editedWorkflowAYaml,
        workflowId: 'workflow-a',
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

    bridge.start(chat$, managerB, editorRefB, trackerB, { workflowId: 'workflow-b' });

    const secondEditOnA = WORKFLOW_A_YAML.replace(
      'description: First workflow',
      'description: Another edit on A'
    );
    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'proposal-a-late',
        beforeYaml: editedWorkflowAYaml,
        afterYaml: secondEditOnA,
        workflowId: 'workflow-a',
      })
    );

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'proposal-b',
        beforeYaml: WORKFLOW_B_YAML,
        afterYaml: editedWorkflowBYaml,
        workflowId: 'workflow-b',
      })
    );

    expect(managerB.applyAfterYaml).toHaveBeenCalledTimes(1);
    expect(managerB.applyAfterYaml).toHaveBeenCalledWith(editedWorkflowBYaml);

    bridge.stop();
  });
});

describe('AttachmentBridge: onProposalReceived workflowId', () => {
  it('does not fall back to attachmentId when event workflowId is undefined', () => {
    const chat$ = new Subject<BrowserChatEvent>();
    const editor = createMockEditor('yaml: content');
    const editorRef = { current: editor };
    const tracker = new ProposalTracker();
    const { manager } = createMockProposalManager();

    const onProposalReceived = jest.fn();

    const bridge = new AttachmentBridge();
    bridge.start(chat$, manager, editorRef, tracker, {
      workflowId: 'attachment-uuid-not-a-real-workflow-id',
      onProposalReceived,
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p1',
        beforeYaml: 'yaml: content',
        afterYaml: 'yaml: changed',
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
      workflowId: 'real-workflow-id',
      onProposalReceived,
    });

    chat$.next(
      makeYamlChangedEvent({
        proposalId: 'p1',
        beforeYaml: 'yaml: content',
        afterYaml: 'yaml: changed',
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
