/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSyncExternalStore } from 'react';

/**
 * Shared across every JSON-tree cell in the table so locking a leaf in one row
 * expands that same path in every other row. Not persisted across reloads.
 */
let pinnedNodeIds: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

export const subscribeJsonTreePins = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getJsonTreePinnedNodeIds = (): ReadonlySet<string> => pinnedNodeIds;

export const toggleJsonTreePinnedNodeId = (nodeId: string): void => {
  const next = new Set(pinnedNodeIds);
  if (next.has(nodeId)) {
    next.delete(nodeId);
  } else {
    next.add(nodeId);
  }
  pinnedNodeIds = next;
  emit();
};

/** Test-only: drop every pin so suites do not leak state into one another. */
export const resetJsonTreePins = (): void => {
  if (pinnedNodeIds.size === 0) return;
  pinnedNodeIds = new Set();
  emit();
};

export const useJsonTreePinnedNodeIds = (): ReadonlySet<string> =>
  useSyncExternalStore(subscribeJsonTreePins, getJsonTreePinnedNodeIds, getJsonTreePinnedNodeIds);
