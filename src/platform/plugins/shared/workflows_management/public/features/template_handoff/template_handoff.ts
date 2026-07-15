/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// One-shot handoff of a template's rendered YAML from the library detail page
// to the `/create` editor. The URL of the create page carries a short token
// (`?fromTemplate=<token>`); the YAML itself lives in `sessionStorage` so it
// survives a hard refresh, back/forward, and the `application.navigateToApp`
// remount — without leaking into the URL or browser history.
//
// Consumption is destructive: the sessionStorage entry is removed on read, so
// the token becomes a no-op after the first load. Missing or expired tokens
// fall through to the default create-page YAML.

const STORAGE_PREFIX = 'workflowsManagement.pendingTemplate.';

/** Query-string key used on `/create?fromTemplate=<token>`. */
export const FROM_TEMPLATE_QUERY_PARAM = 'fromTemplate';

const generateToken = (): string => {
  // Short, opaque, URL-safe. Not a security boundary — just an idempotency key.
  const crypto = typeof window !== 'undefined' ? window.crypto : undefined;
  if (crypto?.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
};

/**
 * Stash the rendered template YAML for the next `/create` mount and return the
 * one-shot token to embed in the URL. Returns `undefined` if `sessionStorage`
 * is unavailable — callers should degrade to a plain navigation without the
 * query param in that case.
 */
export const stashTemplateForCreate = (yaml: string): string | undefined => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return undefined;
  }
  const token = generateToken();
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${token}`, yaml);
  } catch {
    return undefined;
  }
  return token;
};

/**
 * Read and remove the YAML stashed under `token`. Returns `undefined` when the
 * token is missing, expired (already consumed), or `sessionStorage` is
 * unavailable — the caller should fall back to the default create-page YAML.
 */
export const consumeTemplateForCreate = (token: string | undefined): string | undefined => {
  if (!token || typeof window === 'undefined' || !window.sessionStorage) {
    return undefined;
  }
  const key = `${STORAGE_PREFIX}${token}`;
  const value = window.sessionStorage.getItem(key);
  if (value == null) {
    return undefined;
  }
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // best-effort — consumption is still valid even if cleanup fails
  }
  return value;
};
