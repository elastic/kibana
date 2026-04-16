/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SuggestionsPayload } from './types';

type SuggestionsListener = (payload: SuggestionsPayload) => void;

/**
 * Pub/sub store for passing enriched suggestion data from the completion
 * provider to the custom suggest widget.
 *
 * The completion provider calls `emitSuggestions()` with enriched items,
 * and the widget hook calls `subscribeSuggestions()` to receive them.
 *
 * This is a module-level singleton — both the provider and the widget
 * import it directly. No React context plumbing needed.
 */

const listeners = new Set<SuggestionsListener>();
let latestPayload: SuggestionsPayload | null = null;

/** Called by the completion provider to emit enriched suggestions. */
export const emitSuggestions = (payload: SuggestionsPayload): void => {
  latestPayload = payload;
  for (const listener of listeners) {
    listener(payload);
  }
};

/** Subscribe to suggestion emissions. Returns an unsubscribe function. */
export const subscribeSuggestions = (cb: SuggestionsListener): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Get the most recently emitted payload (for late subscribers). */
export const getLatestSuggestions = (): SuggestionsPayload | null => latestPayload;

/** Clear stored payload (called on widget dismiss). */
export const clearSuggestions = (): void => {
  latestPayload = null;
};
