/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import { useStableMenuItemsReference } from './use_stable_menu_items_reference';
import type { MenuItem } from '../../types';

const createMenuItems = (labels: string[]): MenuItem[] =>
  labels.map((label, index) => ({
    id: `item-${index}`,
    label,
    href: `/${label}`,
    iconType: 'empty',
  }));

describe('useStableMenuItemsReference', () => {
  it('returns the same reference when the height signature does not change', () => {
    const initialItems = createMenuItems(['Dashboards', 'Discover']);
    const { result, rerender } = renderHook(({ items }) => useStableMenuItemsReference(items), {
      initialProps: { items: initialItems },
    });

    const firstReference = result.current;

    rerender({ items: createMenuItems(['Dashboards', 'Discover']) });

    expect(result.current).toBe(firstReference);
  });

  it('returns a new reference when the height signature changes', () => {
    const initialItems = createMenuItems(['Dashboards', 'Discover']);
    const { result, rerender } = renderHook(({ items }) => useStableMenuItemsReference(items), {
      initialProps: { items: initialItems },
    });

    const updatedItems = createMenuItems(['Dashboards', 'Analytics']);

    rerender({ items: updatedItems });

    expect(result.current).toEqual(updatedItems);
    expect(result.current).not.toBe(initialItems);
  });
});
