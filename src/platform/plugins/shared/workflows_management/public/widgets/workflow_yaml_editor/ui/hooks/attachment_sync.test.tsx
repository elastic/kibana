/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ActiveConversation, BrowserChatEvent } from '@kbn/agent-builder-browser';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_CHANGED_EVENT,
} from '@kbn/workflows/common/constants';
import { useAgentBuilderIntegration } from './use_agent_builder_integration';
import { carryConversationToWorkflow } from '../../../../features/ai_integration';
import { useKibana } from '../../../../hooks/use_kibana';

jest.mock('../../../../hooks/use_kibana');
jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useDispatch: () => jest.fn(),
}));
jest.mock('../../../../hooks/use_telemetry', () => ({
  useTelemetry: () => ({
    reportWorkflowAiChatOpened: jest.fn(),
    reportWorkflowAiSessionCompleted: jest.fn(),
    reportAiProposalReceived: jest.fn(),
    reportAiProposalResolved: jest.fn(),
  }),
}));

// Everything but the Monaco-bound proposal manager stays real: this covers the
// attachment and event wiring between the editor and agent_builder.
const appliedYaml: string[] = [];
jest.mock('../../../../features/ai_integration', () => ({
  ...jest.requireActual('../../../../features/ai_integration'),
  ProposalManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    getDiffHunks: () => [],
    hasPendingProposals: () => false,
    applyAfterYaml: (yaml: string) => appliedYaml.push(yaml),
  })),
}));

jest.mock('uuid', () => {
  let counter = 0;
  return { v4: () => `draft-uuid-${++counter}` };
});

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

interface PendingAttachment {
  id: string;
  type: string;
  origin?: string;
}

/**
 * Stand-in for `agent_builder`'s browser contract, keeping the behaviour this
 * integration depends on:
 *  - attachments upsert by id, so a changed id means an extra attachment;
 *  - `addAttachment` is dropped until the sidebar registers its callbacks,
 *    which happens while it renders;
 *  - opening the sidebar restores the session's last conversation from local
 *    storage, publishing the binding before the conversation is fetched.
 */
const createFakeAgentBuilder = () => {
  const conversations = new Map<string, VersionedAttachment[]>();
  const chat$ = new Subject<BrowserChatEvent>();
  const perConversation$ = new Map<string, Subject<BrowserChatEvent>>();
  const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);

  let acceptsAttachments = false;
  let pending: PendingAttachment[] = [];
  let sessionTag: string | undefined;
  const boundConversations: Array<string | undefined> = [];

  const upsert = (into: PendingAttachment[], next: PendingAttachment[]) => {
    const merged = [...into];
    for (const attachment of next) {
      const at = merged.findIndex((candidate) => candidate.id === attachment.id);
      if (at === -1) merged.push(attachment);
      else merged[at] = attachment;
    }
    return merged;
  };

  const stream$ = (conversationId: string) => {
    let stream = perConversation$.get(conversationId);
    if (!stream) {
      stream = new Subject<BrowserChatEvent>();
      perConversation$.set(conversationId, stream);
    }
    return stream;
  };

  const lastConversationKey = (tag?: string) =>
    `agentBuilder.lastConversation.${tag ?? 'default'}.default`;

  const contract = {
    getAgentBuilderAccess: jest
      .fn()
      .mockResolvedValue({ hasRequiredLicense: true, hasLlmConnector: true }),
    events: {
      chat$: chat$.asObservable(),
      getChatEvents$: (conversationId: string) => stream$(conversationId).asObservable(),
      ui: { activeConversation$: activeConversation$.asObservable() },
    },
    addAttachment: jest.fn((attachment: PendingAttachment) => {
      if (!acceptsAttachments) return;
      pending = upsert(pending, [attachment]);
    }),
    removeAttachment: jest.fn((attachmentId: string) => {
      if (!acceptsAttachments) return;
      pending = pending.filter((attachment) => attachment.id !== attachmentId);
    }),
    setChatConfig: jest.fn((config: { sessionTag?: string; attachments?: PendingAttachment[] }) => {
      sessionTag = config.sessionTag;
      if (acceptsAttachments && config.attachments) pending = upsert(pending, config.attachments);
    }),
    clearChatConfig: jest.fn(),
    openChat: jest.fn((options: { sessionTag?: string; attachments?: PendingAttachment[] }) => {
      sessionTag = options.sessionTag;
      pending = [...(options.attachments ?? [])];

      const stored = window.localStorage.getItem(lastConversationKey(options.sessionTag));
      const restoredId = stored ? (JSON.parse(stored) as string) : undefined;
      boundConversations.push(restoredId);

      // The real provider renders once before its local-storage hook hydrates.
      // A restored chat therefore briefly looks like a new conversation.
      activeConversation$.next({ id: undefined });

      // It then publishes the binding before its attachment callbacks are
      // registered and before the conversation fetch lands.
      activeConversation$.next({ id: restoredId });
      acceptsAttachments = true;
      if (restoredId) {
        activeConversation$.next({
          id: restoredId,
          conversation: { attachments: conversations.get(restoredId) ?? [] },
        } as ActiveConversation);
      }

      return {
        chatRef: {
          close: () => {
            acceptsAttachments = false;
          },
        },
      };
    }),
    updateAttachmentOrigin: jest.fn(async (conversationId: string, id: string, origin: string) => {
      const target = (conversations.get(conversationId) ?? []).find(
        (attachment) => attachment.id === id
      );
      if (target) target.origin = origin;
      return undefined;
    }),
  };

  /** Persists whatever the input holds, the way sending a message does. */
  const submitRound = (conversationId: string) => {
    const stored = conversations.get(conversationId) ?? [];
    for (const attachment of pending) {
      const existing = stored.find((candidate) => candidate.id === attachment.id);
      if (existing) {
        existing.versions.push({ version: existing.versions.length + 1 } as never);
      } else {
        stored.push({
          ...attachment,
          versions: [{ version: 1 }],
          current_version: 1,
        } as unknown as VersionedAttachment);
      }
    }
    conversations.set(conversationId, stored);
    window.localStorage.setItem(lastConversationKey(sessionTag), JSON.stringify(conversationId));
    activeConversation$.next({
      id: conversationId,
      conversation: { attachments: stored },
    } as ActiveConversation);
  };

  /** A conversation and its attachments as a fresh page load would find them. */
  const seedConversation = (
    conversationId: string,
    tag: string,
    attachments: Array<{ id: string; origin?: string }>
  ) => {
    conversations.set(
      conversationId,
      attachments.map(
        (attachment) =>
          ({
            ...attachment,
            type: WORKFLOW_YAML_ATTACHMENT_TYPE,
            versions: [{ version: 1 }],
            current_version: 1,
          } as unknown as VersionedAttachment)
      )
    );
    window.localStorage.setItem(lastConversationKey(tag), JSON.stringify(conversationId));
  };

  /** What the save handoff leaves behind: the session tag points at the conversation. */
  const pointSessionAtConversation = (tag: string, conversationId: string) => {
    window.localStorage.setItem(lastConversationKey(tag), JSON.stringify(conversationId));
  };

  const publishConversation = (conversationId: string) => {
    activeConversation$.next({
      id: conversationId,
      conversation: { attachments: conversations.get(conversationId) ?? [] },
    } as ActiveConversation);
  };

  const emitYamlChange = (conversationId: string, attachmentId: string, afterYaml: string) => {
    stream$(conversationId).next({
      type: ChatEventType.toolUi,
      data: {
        tool_id: 'generate_workflow',
        tool_call_id: 'call-1',
        custom_event: WORKFLOW_YAML_CHANGED_EVENT,
        data: { proposalId: `p-${afterYaml.length}`, beforeYaml: '', afterYaml, attachmentId },
      },
    } as unknown as BrowserChatEvent);
  };

  const workflowAttachmentIds = (conversationId: string) =>
    (conversations.get(conversationId) ?? [])
      .filter((attachment) => attachment.type === WORKFLOW_YAML_ATTACHMENT_TYPE)
      .map((attachment) => attachment.id);

  const pendingWorkflowAttachmentIds = () =>
    pending
      .filter((attachment) => attachment.type === WORKFLOW_YAML_ATTACHMENT_TYPE)
      .map((attachment) => attachment.id);

  /** Conversation the sidebar bound to on its most recent open, if any. */
  const lastBoundConversation = () => boundConversations.at(-1);

  return {
    contract,
    lastBoundConversation,
    submitRound,
    seedConversation,
    pointSessionAtConversation,
    emitYamlChange,
    pendingWorkflowAttachmentIds,
    publishConversation,
    workflowAttachmentIds,
  };
};

type FakeAgentBuilder = ReturnType<typeof createFakeAgentBuilder>;

const setupKibana = (agentBuilder: FakeAgentBuilder['contract']) => {
  useKibanaMock.mockReturnValue({
    services: {
      workflowsManagement: { agentBuilder },
      application: { capabilities: { agentBuilder: { show: true } } },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

const createEditor = () =>
  ({
    getModel: () => ({
      getValue: () => 'name: test',
      onDidChangeContent: () => ({ dispose: jest.fn() }),
    }),
  } as never);

const renderEditor = async (workflowId?: string) => {
  const rendered = renderHook(() =>
    useAgentBuilderIntegration({
      editorRef: { current: createEditor() },
      isEditorMounted: true,
      workflowId,
    })
  );
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
};

describe('workflow attachment sync', () => {
  beforeEach(() => {
    window.localStorage.clear();
    appliedYaml.length = 0;
  });

  it('keeps one attachment across create, save and the handed-over conversation', async () => {
    const fake = createFakeAgentBuilder();
    setupKibana(fake.contract);

    const createSession = await renderEditor(undefined);
    act(() => createSession.result.current.openAgentChat());
    act(() => fake.submitRound('conv-1'));

    const [draftId] = fake.workflowAttachmentIds('conv-1');
    expect(draftId).toBeDefined();

    // The save thunk hands the chat over before the app remounts the editor on
    // the saved workflow's route.
    carryConversationToWorkflow('workflow-a');
    createSession.unmount();

    const savedSession = await renderEditor('workflow-a');
    act(() => savedSession.result.current.openAgentChat());

    // The chat must continue where it left off, not open a blank one.
    expect(fake.lastBoundConversation()).toBe('conv-1');

    act(() => fake.submitRound('conv-1'));

    expect(fake.workflowAttachmentIds('conv-1')).toEqual([draftId]);
  });

  describe('after a page reload', () => {
    // The handoff state carrying the create session's attachment id lives in
    // module scope, so a reload loses it. Only the conversation, and the
    // local-storage pointer to it, survive.
    it('reuses the attachment the restored conversation already holds', async () => {
      const fake = createFakeAgentBuilder();
      setupKibana(fake.contract);
      fake.seedConversation('conv-2', 'workflow-editor:workflow-b', [
        { id: 'draft-from-before-reload', origin: 'workflow-b' },
      ]);

      const session = await renderEditor('workflow-b');
      act(() => session.result.current.openAgentChat());
      act(() => fake.submitRound('conv-2'));

      expect(fake.workflowAttachmentIds('conv-2')).toEqual(['draft-from-before-reload']);
    });

    it('reuses a legacy create-session attachment with an arbitrary id', async () => {
      const fake = createFakeAgentBuilder();
      setupKibana(fake.contract);
      fake.seedConversation('conv-legacy', 'workflow-editor:workflow-legacy', [
        // Before the fixed editor id and origin link existed, a conversation
        // started on /create kept its generated UUID after the workflow saved.
        { id: 'legacy-draft-uuid' },
      ]);

      const session = await renderEditor('workflow-legacy');
      act(() => session.result.current.openAgentChat());
      act(() => fake.submitRound('conv-legacy'));

      expect(fake.workflowAttachmentIds('conv-legacy')).toEqual(['legacy-draft-uuid']);
      expect(fake.contract.updateAttachmentOrigin).toHaveBeenCalledWith(
        'conv-legacy',
        'legacy-draft-uuid',
        'workflow-legacy'
      );
    });

    it('replaces an eagerly staged attachment when the legacy conversation appears later', async () => {
      const fake = createFakeAgentBuilder();
      setupKibana(fake.contract);
      fake.seedConversation('conv-late', 'workflow-editor:another-workflow', [
        { id: 'legacy-late-uuid', origin: 'workflow-late' },
      ]);

      const session = await renderEditor('workflow-late');
      act(() => session.result.current.openAgentChat());

      expect(fake.pendingWorkflowAttachmentIds()).toEqual(['workflow-yaml-editor']);

      act(() => fake.publishConversation('conv-late'));
      const [submittedAttachmentId] = fake.pendingWorkflowAttachmentIds();
      act(() => fake.submitRound('conv-late'));
      act(() => fake.emitYamlChange('conv-late', submittedAttachmentId, 'name: edited by agent'));

      expect(fake.workflowAttachmentIds('conv-late')).toEqual(['legacy-late-uuid']);
      expect(appliedYaml).toEqual(['name: edited by agent']);
    });

    it('reuses the attachment even when its origin was never linked', async () => {
      // A create session persisted its attachment, but the origin link never
      // landed. After a reload the handoff state is gone, so the only thing
      // that can still identify that attachment is its id.
      const fake = createFakeAgentBuilder();
      setupKibana(fake.contract);

      const createSession = await renderEditor(undefined);
      act(() => createSession.result.current.openAgentChat());
      act(() => fake.submitRound('conv-4'));
      createSession.unmount();

      const [attachmentFromBeforeReload] = fake.workflowAttachmentIds('conv-4');
      expect(attachmentFromBeforeReload).toBeDefined();

      // The reload: local storage still points this workflow's chat at the
      // conversation, but nothing in memory survives.
      fake.pointSessionAtConversation('workflow-editor:workflow-e', 'conv-4');

      const reloaded = await renderEditor('workflow-e');
      act(() => reloaded.result.current.openAgentChat());
      act(() => fake.submitRound('conv-4'));

      expect(fake.workflowAttachmentIds('conv-4')).toEqual([attachmentFromBeforeReload]);
    });

    it('applies the diff the agent sends back for that round', async () => {
      const fake = createFakeAgentBuilder();
      setupKibana(fake.contract);
      fake.seedConversation('conv-3', 'workflow-editor:workflow-c', [
        { id: 'draft-from-before-reload', origin: 'workflow-c' },
      ]);

      const session = await renderEditor('workflow-c');
      act(() => session.result.current.openAgentChat());
      act(() => fake.submitRound('conv-3'));

      // The agent edits the workflow attachment the round carried. A second one
      // splits the editor from the agent, whichever of the two each ends up on.
      expect(fake.workflowAttachmentIds('conv-3')).toHaveLength(1);

      const edited = fake.workflowAttachmentIds('conv-3').at(-1)!;
      act(() => fake.emitYamlChange('conv-3', edited, 'name: edited by agent'));

      expect(appliedYaml).toEqual(['name: edited by agent']);
    });
  });
});
