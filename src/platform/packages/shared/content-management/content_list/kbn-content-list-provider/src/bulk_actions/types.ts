/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionId, ContentListItem } from '../item';

/**
 * Registry entry pairing a bulk action's identifier with its restriction
 * predicate.
 *
 * The registry is a pure projection of `itemConfig.actions`.
 * `ContentListProvider` registers an entry per action whose `onBulkAction`
 * handler AND `restriction` predicate are both supplied.
 */
export interface RegisteredBulkAction {
  /** Stable identifier for the bulk action (e.g. `'delete'`). */
  actionId: ActionId;
  /** Predicate returning a reason when the action is restricted on `item`. */
  restriction: (item: ContentListItem) => string | undefined;
}
