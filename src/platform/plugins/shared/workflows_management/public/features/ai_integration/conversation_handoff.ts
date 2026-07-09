/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Persistence for the "carry the /workflows/create chat into the saved
// workflow's detail view" flow. The agent_builder plugin persists the last
// conversation id per `sessionTag`, and the workflow editor's sessionTag is
// `workflow-editor:${attachmentId}` where attachmentId is either the saved
// workflow id or a UUID minted for the unsaved create session. On save+nav,
// those tags differ and the newly-mounted editor would open an empty chat.
//
// This module remembers the create-time attachmentId so the save thunk can
// copy the persisted conversation-id localStorage entries onto the saved
// workflow's tag before navigation.

const SESSION_TAG_PREFIX = 'workflow-editor:';
const STORAGE_KEY_PREFIX = 'agentBuilder.lastConversation.';

let lastCreateAttachmentId: string | undefined;

export const setLastCreateAttachmentId = (attachmentId: string | undefined): void => {
  lastCreateAttachmentId = attachmentId;
};

export const getLastCreateAttachmentId = (): string | undefined => lastCreateAttachmentId;

/**
 * Copy every persisted conversation-id entry keyed by the create session's
 * tag onto the saved workflow's tag. The stored keys include an agent id
 * suffix (`agentBuilder.lastConversation.${tag}.${agentId}`) which we don't
 * know here, so we iterate the prefix and rewrite the tag portion.
 *
 * No-ops if no create session was tracked, or if `localStorage` is unavailable
 * (SSR, tests without jsdom's storage).
 */
export const carryConversationToWorkflow = (savedWorkflowId: string): void => {
  const from = lastCreateAttachmentId;
  lastCreateAttachmentId = undefined;

  if (!from || from === savedWorkflowId) return;
  if (typeof window === 'undefined' || !window.localStorage) return;

  const fromTag = `${SESSION_TAG_PREFIX}${from}`;
  const toTag = `${SESSION_TAG_PREFIX}${savedWorkflowId}`;
  const fromPrefix = `${STORAGE_KEY_PREFIX}${fromTag}.`;

  // Snapshot keys first — mutating localStorage while iterating can shift indexes.
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(fromPrefix)) keys.push(key);
  }

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value != null) {
      const suffix = key.slice(fromPrefix.length);
      const targetKey = `${STORAGE_KEY_PREFIX}${toTag}.${suffix}`;
      window.localStorage.setItem(targetKey, value);
      window.localStorage.removeItem(key);
    }
  }
};
