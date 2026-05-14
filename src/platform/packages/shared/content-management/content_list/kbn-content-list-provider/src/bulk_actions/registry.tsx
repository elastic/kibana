/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { ContentListItemConfig } from '../item';
import type { RegisteredBulkAction } from './types';

/**
 * Internal registry context value: the current list of registered bulk
 * actions, derived from `itemConfig.actions`. The registry is a pure
 * projection of provider config.
 */
interface BulkActionRegistryContextValue {
  /** Latest list of registered bulk actions (keyed by `actionId`). */
  actions: RegisteredBulkAction[];
}

/**
 * Context that exposes the bulk-action registry to consumers (the row
 * selection bridge and the toolbar's delete-confirmation dialog).
 *
 * @internal Provided directly by `ContentListProvider`; readers go
 * through {@link useBulkActionRestrictions}.
 */
export const BulkActionRegistryContext = createContext<BulkActionRegistryContextValue | null>(null);

/**
 * Build the bulk-action entries that are operative for the current
 * provider configuration.
 *
 * "Operative" means both `onBulkAction` and `restriction` are configured.
 * Without a handler, the action can't be taken. Without a restriction,
 * the action is unrestricted.
 */
export const buildRegisteredActions = (
  itemConfig: ContentListItemConfig | undefined
): RegisteredBulkAction[] => {
  if (!itemConfig?.actions) {
    return [];
  }

  const result: RegisteredBulkAction[] = [];

  for (const [actionId, config] of Object.entries(itemConfig.actions)) {
    if (typeof config?.onBulkAction === 'function' && typeof config.restriction === 'function') {
      result.push({ actionId, restriction: config.restriction });
    }
  }

  return result;
};

/**
 * Internal accessor for the bulk-action registry context.
 *
 * Returns `null` when invoked outside `ContentListProvider`, so the
 * public read hook can degrade gracefully (no registered actions). The
 * package always wraps consumers in a provider, so `null` only occurs
 * in test setups that bypass `ContentListProvider`.
 *
 * @internal
 */
export const useBulkActionRegistryContext = (): BulkActionRegistryContextValue | null => {
  return useContext(BulkActionRegistryContext);
};
