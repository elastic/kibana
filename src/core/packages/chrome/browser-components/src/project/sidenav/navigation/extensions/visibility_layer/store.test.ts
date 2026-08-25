/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NavigationStructure } from '@kbn/ui-side-navigation/types';

import { applyExtensionVisibility } from '../utils';
import { createExtensionVisibilityStore } from './store';
import type { NavigationItems } from '../../to_navigation_items';

const createExtensionSection = (extensionId: string) => ({
  id: `${extensionId}-slot`,
  slotId: `${extensionId}-slot`,
  extensionId,
});

const createBaseItems = (
  sections: NavigationItems['navItems']['primaryItems'][number]['sections'],
  hideWhenEmptyExtensionIds: ReadonlySet<string> = new Set(['recentlyAccessedDashboards'])
): NavigationItems => {
  const navItems: NavigationStructure = {
    primaryItems: [
      {
        id: 'dashboards',
        label: 'Dashboards',
        href: '/app/dashboards',
        iconType: 'dashboardApp',
        sections,
      },
    ],
    footerItems: [],
  };

  return { navItems, hideWhenEmptyExtensionIds };
};

describe('ExtensionVisibilityStore', () => {
  it('latches shown and ignores further reportData calls', () => {
    const store = createExtensionVisibilityStore();

    store.reportData('recentlyAccessedDashboards', [{ id: '1' }]);
    expect(store.get('recentlyAccessedDashboards')).toBe('shown');

    const revisionAfterShow = store.visibilityRevision;
    store.reportData('recentlyAccessedDashboards', [{ id: '1' }, { id: '2' }]);

    expect(store.visibilityRevision).toBe(revisionAfterShow);
  });

  it('transitions hidden to shown when data arrives', () => {
    const store = createExtensionVisibilityStore();

    store.reportData('recentlyAccessedDashboards', []);
    expect(store.get('recentlyAccessedDashboards')).toBe('hidden');

    const revisionAfterHidden = store.visibilityRevision;
    store.reportData('recentlyAccessedDashboards', [{ id: '1' }]);

    expect(store.get('recentlyAccessedDashboards')).toBe('shown');
    expect(store.visibilityRevision).toBe(revisionAfterHidden + 1);
  });

  it('throws when getVisibleNavigationItems receives a stale revision', () => {
    const store = createExtensionVisibilityStore();
    const baseItems = createBaseItems([createExtensionSection('recentlyAccessedDashboards')]);

    store.reportData('recentlyAccessedDashboards', []);

    expect(() => store.getVisibleNavigationItems(baseItems, 0)).toThrow(/Stale visibilityRevision/);
  });

  it('returns the same reference when filtering does not remove sections', () => {
    const store = createExtensionVisibilityStore();
    const baseItems = createBaseItems([
      {
        id: 'dashboards-section',
        label: 'Dashboards',
        items: [
          {
            id: 'all-dashboards',
            label: 'All dashboards',
            href: '/app/dashboards',
          },
        ],
      },
      createExtensionSection('recentlyAccessedDashboards'),
    ]);

    store.reportData('recentlyAccessedDashboards', [{ id: '1' }]);

    const first = store.getVisibleNavigationItems(baseItems, store.visibilityRevision);
    const second = store.getVisibleNavigationItems(baseItems, store.visibilityRevision);

    expect(second).toBe(first);
  });
});

describe('applyExtensionVisibility', () => {
  it('strips hidden opt-in extension sections and keeps the primary item as a direct link', () => {
    const store = createExtensionVisibilityStore();
    const baseItems = createBaseItems([createExtensionSection('recentlyAccessedDashboards')]);

    store.reportData('recentlyAccessedDashboards', []);

    const visibleItems = applyExtensionVisibility(baseItems, store, store.visibilityRevision);

    expect(visibleItems.navItems.primaryItems).toHaveLength(1);
    expect(visibleItems.navItems.primaryItems[0].sections).toBeUndefined();
  });

  it('keeps panel openers with static sections when the opt-in extension is hidden', () => {
    const store = createExtensionVisibilityStore();
    const baseItems = createBaseItems([
      createExtensionSection('recentlyAccessedDashboards'),
      {
        id: 'dashboards-section',
        label: 'Dashboards',
        items: [
          {
            id: 'all-dashboards',
            label: 'All dashboards',
            href: '/app/dashboards',
          },
        ],
      },
    ]);

    store.reportData('recentlyAccessedDashboards', []);

    const visibleItems = applyExtensionVisibility(baseItems, store, store.visibilityRevision);

    expect(visibleItems.navItems.primaryItems).toHaveLength(1);
    expect(visibleItems.navItems.primaryItems[0].sections).toHaveLength(1);
    expect(visibleItems.navItems.primaryItems[0].sections?.[0].id).toBe('dashboards-section');
  });

  it('keeps non-opt-in extension sections even when data is empty', () => {
    const store = createExtensionVisibilityStore();
    const baseItems = createBaseItems(
      [createExtensionSection('recentlyAccessedDashboards')],
      new Set()
    );

    store.reportData('recentlyAccessedDashboards', []);

    const visibleItems = applyExtensionVisibility(baseItems, store, store.visibilityRevision);

    expect(visibleItems.navItems.primaryItems).toHaveLength(1);
    expect(visibleItems.navItems.primaryItems[0].sections).toHaveLength(1);
    expect(visibleItems.navItems.primaryItems[0].sections?.[0].extensionId).toBe(
      'recentlyAccessedDashboards'
    );
  });
});
