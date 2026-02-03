/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useRef } from 'react';

import type { MenuItem } from '../../types';
import { haveSameHeightSignature } from '../utils/have_same_height_signature';

/**
 * Get a stable reference to the items array that changes only when we need to recalculate the height.
 *
 * @param items - menu items.
 * @returns the stable items reference.
 */
export const useStableMenuItemsReference = (items: MenuItem[]): MenuItem[] => {
  const ref = useRef<MenuItem[]>(items);
  const out = haveSameHeightSignature(ref.current, items) ? ref.current : items;

  // Don’t write to a ref during render
  useLayoutEffect(() => {
    if (!haveSameHeightSignature(ref.current, items)) {
      ref.current = items;
    }
  }, [items]);

  return out;
};
