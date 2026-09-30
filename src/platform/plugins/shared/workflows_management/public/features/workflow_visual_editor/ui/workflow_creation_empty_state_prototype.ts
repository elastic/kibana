/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Prototype flag: when true, structurally empty workflows show the creation
 * empty state (AI prompt / triggers / templates). Default off so new workflows
 * land on the visual builder canvas instead.
 */
const STORAGE_KEY = 'workflows.creationEmptyStatePrototype';

let sessionValue: boolean | undefined;
const listeners = new Set<() => void>();

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

export const getShowCreationEmptyState = (): boolean => {
  if (sessionValue !== undefined) return sessionValue;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'true' || stored === 'false') {
      sessionValue = stored === 'true';
      return sessionValue;
    }
  } catch {
    // sessionStorage unavailable
  }
  sessionValue = false;
  return false;
};

export const setShowCreationEmptyState = (next: boolean): void => {
  sessionValue = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // sessionStorage unavailable
  }
  notify();
};

export const subscribeShowCreationEmptyState = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** @internal clears session flag between Jest cases. */
export const resetShowCreationEmptyStateForTests = (): void => {
  sessionValue = undefined;
  listeners.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
