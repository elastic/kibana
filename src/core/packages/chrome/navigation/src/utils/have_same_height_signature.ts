/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem } from '../../types';

/**
 * Pre-check to see if the item's height might have changed and if we need to do a full recalculation.
 *
 * @param prev - previous menu items.
 * @param next - next menu items.
 * @returns (boolean) whether the menu items have the same height signature.
 */
export const haveSameHeightSignature = (prev: MenuItem[], next: MenuItem[]): boolean => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    // Only compare properties that might affect height
    if (prev[i].label !== next[i].label) return false;
  }
  return true;
};
