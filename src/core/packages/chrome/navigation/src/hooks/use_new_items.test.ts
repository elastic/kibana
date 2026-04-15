/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { IconType } from '@elastic/eui';

import { useNewItems } from './use_new_items';
import type { MenuItem, SecondaryMenuItem } from '../../types';

const STORAGE_KEY = 'core.chrome.sidenav.newItems';

const createSecondary = (
  id: string,
  label: string,
  badgeType?: 'beta' | 'techPreview' | 'new'
): SecondaryMenuItem => ({
  id,
  label,
  badgeType,
  href: `/${id}`,
});

const createPrimary = (
  id: string,
  label: string,
  sections: MenuItem['sections'] = [],
  badgeType?: 'beta' | 'techPreview' | 'new'
): MenuItem => ({
  id,
  label,
  href: `/${id}`,
  iconType: 'empty' as IconType,
  sections,
  badgeType,
});

const primaryItems: MenuItem[] = [
  createPrimary('home', 'Home', [], 'new'),
  createPrimary(
    'dashboards',
    'Dashboards',
    [
      {
        id: 'dashboards-section',
        items: [createSecondary('dashboards-overview', 'Overview')],
      },
    ],
    'new'
  ),
];

const primaryItemsWithNewSecondaryItems: MenuItem[] = [
  createPrimary('home', 'Home', []),
  createPrimary('dashboards', 'Dashboards', [
    {
      id: 'dashboards-section',
      items: [
        createSecondary('dashboards-subitem-1', 'Subitem 1', 'new'),
        createSecondary('dashboards-subitem-2', 'Subitem 2', 'new'),
        createSecondary('dashboards-subitem-3', 'Subitem 3', 'new'),
      ],
    },
  ]),
];

const footerItems: MenuItem[] = [
  createPrimary('settings', 'Settings', [
    {
      id: 'settings-section',
      items: [createSecondary('footer-subitem-1', 'Footer Subitem 1', 'new')],
    },
  ]),
];

describe('useNewItems', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Max new items limits', () => {
    it('enforces max 2 new primary items', () => {
      const { result } = renderHook(() => useNewItems([...primaryItems, ...footerItems]));

      expect(result.current.getIsNewPrimary('home')).toBe(true);
      expect(result.current.getIsNewPrimary('dashboards')).toBe(true);
      expect(result.current.getIsNewPrimary('settings')).toBe(false);
    });

    it('enforces max 2 new secondary items per parent', () => {
      const { result } = renderHook(() =>
        useNewItems([...primaryItemsWithNewSecondaryItems, ...footerItems])
      );

      expect(result.current.getIsNewSecondary('dashboards-subitem-1')).toBe(true);
      expect(result.current.getIsNewSecondary('dashboards-subitem-2')).toBe(true);
      expect(result.current.getIsNewSecondary('dashboards-subitem-3')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('loads visited items from localStorage on mount', () => {
      const visitedItems = ['dashboards', 'settings'];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visitedItems));

      const { result } = renderHook(() => useNewItems([...primaryItems, ...footerItems]));

      expect(result.current.getIsNewPrimary('dashboards')).toBe(false);
      expect(result.current.getIsNewPrimary('settings')).toBe(false);
    });

    it('persists visited items to localStorage', () => {
      const { result, rerender } = renderHook((activeItemId?: string) =>
        useNewItems([...primaryItems, ...footerItems], activeItemId)
      );

      // Rerender with primary item being active
      rerender('dashboards');
      expect(result.current.getIsNewPrimary('dashboards')).toBe(true);

      // Simulate navigating away to another item - last active item is marked as visited
      rerender('home');
      expect(result.current.getIsNewPrimary('dashboards')).toBe(false);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBe(JSON.stringify(['dashboards']));
    });
  });

  describe('Visited items', () => {
    it('auto-marks new primary item as visited after clicking on it and navigating away from it', () => {
      // Initial render - no active item
      const { result, rerender } = renderHook((activeItemId?: string) =>
        useNewItems([...primaryItems, ...footerItems], activeItemId)
      );

      expect(result.current.getIsNewPrimary('dashboards')).toBe(true);

      // Rerender with primary item being active
      rerender('dashboards');
      expect(result.current.getIsNewPrimary('dashboards')).toBe(true);

      // Simulate navigating away to another item - item loses new status
      rerender('home');
      expect(result.current.getIsNewPrimary('dashboards')).toBe(false);
    });

    it('marks both parent and child as visited after clicking on child and navigating away from it', () => {
      // Initial render - no active item
      const { result, rerender } = renderHook((activeItemId?: string) =>
        useNewItems([...primaryItemsWithNewSecondaryItems, ...footerItems], activeItemId)
      );

      expect(result.current.getIsNewPrimary('settings')).toBe(true);
      expect(result.current.getIsNewSecondary('footer-subitem-1')).toBe(true);

      // Rerender with child item being active
      rerender('footer-subitem-1');
      expect(result.current.getIsNewPrimary('settings')).toBe(true);
      expect(result.current.getIsNewSecondary('footer-subitem-1')).toBe(true);

      // Simulate navigating away to another item - both items lose new status
      rerender('home');
      expect(result.current.getIsNewPrimary('settings')).toBe(false);
      expect(result.current.getIsNewSecondary('footer-subitem-1')).toBe(false);
    });
  });
});
