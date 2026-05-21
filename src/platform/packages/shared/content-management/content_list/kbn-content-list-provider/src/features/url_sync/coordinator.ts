/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: This is a stopgap. Disabling URL sync on secondary lists means only
// one list per route can persist its query/sort to the URL. The long-term
// fix is to namespace each list's URL keys by a configurable prefix (e.g.
// `${id}.q`, `${id}.sort`) so multiple lists can persist independently
// without colliding. When that lands, this coordinator becomes the gate
// for per-prefix URL key allocation rather than a hard cutoff.

import type { History } from 'history';

/**
 * Per-`History` slot bookkeeping for URL-syncing content lists.
 */
interface Slot {
  /** Symbol of the member that currently owns the primary slot, or `null` when free. */
  primary: symbol | null;
  /** Optional human-readable label for the primary owner, surfaced in dev warnings. */
  primaryLabel?: string;
  /** All currently-claimed members on this `History`. Used to clean up the registry entry. */
  members: Set<symbol>;
}

/**
 * Module-level registry keyed by the `History` instance that
 * `react-router-dom`'s `useHistory()` returns. A `WeakMap` lets the slot
 * entry be garbage-collected with the router.
 */
const registry = new WeakMap<History, Slot>();

/**
 * The result of {@link claimUrlSyncSlot}.
 */
export interface UrlSyncSlotClaim {
  /** `true` when this caller owns the primary (URL-writing) slot for the `History`. */
  isPrimary: boolean;
  /** Label of the current primary owner, if any. Useful for diagnostics in non-primary callers. */
  primaryLabel?: string;
  /** Releases the claim. Safe to call exactly once. */
  release: () => void;
}

/**
 * Claim a URL-sync slot on the given `history`.
 *
 * The first caller for a given `history` receives `isPrimary: true` and
 * owns the right to read and write the URL. Subsequent callers receive
 * `isPrimary: false` and should disable their own URL syncing to avoid
 * colliding with the primary on the same query keys.
 *
 * When the primary releases, the next caller to claim becomes the new
 * primary. Existing secondaries are not promoted retroactively.
 *
 * @param history - The router `History` instance to claim a slot on.
 * @param label - Optional label (typically the consumer's `id`) recorded
 *   on the primary slot so secondary callers can surface it in diagnostics.
 * @returns The slot claim, including a `release` function for cleanup.
 */
export const claimUrlSyncSlot = (history: History, label?: string): UrlSyncSlotClaim => {
  let slot = registry.get(history);
  if (!slot) {
    slot = { primary: null, members: new Set() };
    registry.set(history, slot);
  }

  const memberId = Symbol('ContentListUrlSyncSlot');
  slot.members.add(memberId);

  const isPrimary = slot.primary === null;
  if (isPrimary) {
    slot.primary = memberId;
    slot.primaryLabel = label;
  }

  const primaryLabel = slot.primaryLabel;

  return {
    isPrimary,
    primaryLabel,
    release: () => {
      const current = registry.get(history);
      if (!current) {
        return;
      }
      current.members.delete(memberId);
      if (current.primary === memberId) {
        current.primary = null;
        current.primaryLabel = undefined;
      }
      if (current.members.size === 0) {
        registry.delete(history);
      }
    },
  };
};
