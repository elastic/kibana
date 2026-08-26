/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '../item';

/**
 * One row in the `skipped` partition: an item that cannot have the bulk
 * action applied to it, paired with the human-readable reason returned by
 * the action's restriction predicate.
 */
export interface BulkActionSkippedItem {
  /** The original item the consumer asked the action to apply to. */
  item: ContentListItem;
  /** Reason string from the action's restriction predicate. */
  reason: string;
}

/**
 * The result of partitioning a bulk-action request through one action's
 * restriction predicate.
 *
 * `permitted` is the subset of items the action's confirm dialog will
 * forward to the action handler if the user confirms; `skipped` is the
 * subset shown in the dialog's "can't be acted upon" callout so the user
 * knows up-front that not every requested item will be affected.
 */
export interface BulkActionPartition {
  permitted: ContentListItem[];
  skipped: BulkActionSkippedItem[];
}

/**
 * Partition `items` into permitted and non-permitted subsets using a
 * single bulk-action restriction predicate.
 *
 * Items the predicate marks as restricted are routed to `skipped`
 * (with reason), and only `permitted` items reach the action handler.
 * When `restriction` is `undefined`, every item is permitted.
 */
export const partitionByRestriction = (
  items: ContentListItem[],
  restriction?: (item: ContentListItem) => string | undefined
): BulkActionPartition => {
  if (!restriction) {
    return { permitted: items.slice(), skipped: [] };
  }

  const permitted: ContentListItem[] = [];
  const skipped: BulkActionSkippedItem[] = [];

  for (const item of items) {
    const reason = restriction(item);
    if (reason === undefined) {
      permitted.push(item);
    } else {
      skipped.push({ item, reason });
    }
  }

  return { permitted, skipped };
};
