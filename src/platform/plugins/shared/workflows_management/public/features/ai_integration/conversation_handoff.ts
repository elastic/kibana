/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Module-level handoff state that survives `application.navigateToApp`
// remounts so the /workflows/create chat can continue on the saved detail
// view. See `carryConversationToWorkflow` below.

const SESSION_TAG_PREFIX = 'workflow-editor:';
const STORAGE_KEY_PREFIX = 'agentBuilder.lastConversation.';

// Session id of the `/workflows/create` chat, so its conversation can be moved
// onto the saved workflow's session tag. This is the id the tag is built from,
// not the id of the attachment the chat carries.
let lastCreateSessionId: string | undefined;

export const setLastCreateSessionId = (sessionId: string | undefined): void => {
  lastCreateSessionId = sessionId;
};

let sidebarOpen = false;

export const setSidebarOpen = (open: boolean): void => {
  sidebarOpen = open;
};

export const isSidebarOpen = (): boolean => sidebarOpen;

// Single-shot: set by the save thunk when the sidebar was open, consumed by
// the destination editor's auto-open effect for a matching workflowId.
let pendingSidebarRestore: string | undefined;

export const requestSidebarRestore = (workflowId: string): void => {
  pendingSidebarRestore = workflowId;
};

export const consumeSidebarRestoreFor = (workflowId: string): boolean => {
  if (pendingSidebarRestore !== workflowId) return false;
  pendingSidebarRestore = undefined;
  return true;
};

/**
 * True when the sidebar will restore a conversation for this session, which the
 * editor cannot sync into until it knows which attachment that conversation
 * already holds. Mirrors the key `agent_builder` writes on open.
 */
export const hasPersistedConversation = (sessionId: string): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  const prefix = `${STORAGE_KEY_PREFIX}${SESSION_TAG_PREFIX}${sessionId}.`;
  for (let i = 0; i < window.localStorage.length; i++) {
    if (window.localStorage.key(i)?.startsWith(prefix)) return true;
  }
  return false;
};

/**
 * Rewrite persisted conversation-id localStorage entries from the create
 * session's tag onto `savedWorkflowId`'s tag. Iterates a prefix because keys
 * include a trailing agentId we don't know here. No-op if no create session
 * was tracked or `localStorage` is unavailable.
 */
export const carryConversationToWorkflow = (savedWorkflowId: string): void => {
  const from = lastCreateSessionId;
  lastCreateSessionId = undefined;

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
      // Independent try/catch so a quota-exceeded write still cleans up the
      // source, and a failing remove doesn't abort remaining keys.
      try {
        window.localStorage.setItem(targetKey, value);
      } catch {
        // best-effort
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        // best-effort
      }
    }
  }
};
