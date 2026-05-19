/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { History } from 'history';
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
export declare const claimUrlSyncSlot: (history: History, label?: string) => UrlSyncSlotClaim;
