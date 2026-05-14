/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useBulkActionRegistryContext } from './registry';
import type { RegisteredBulkAction } from './types';

const EMPTY: RegisteredBulkAction[] = [];

/**
 * Read the bulk actions currently registered on the active content list.
 *
 * The registry is purely a projection of `itemConfig.actions`, derived
 * by `ContentListProvider` on every render.
 *
 * Returns an empty array when called outside a content list provider.
 */
export const useBulkActionRestrictions = (): RegisteredBulkAction[] => {
  const ctx = useBulkActionRegistryContext();
  return ctx?.actions ?? EMPTY;
};
