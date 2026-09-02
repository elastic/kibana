/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  NavigationTreeDefinitionUI,
  ProjectNavigationLinkListSection,
} from '@kbn/core-chrome-browser';
import { filter, firstValueFrom, of, throwError } from 'rxjs';
import type { MenuItem } from '@kbn/ui-side-navigation/types';
import { attachPopoverSections, resolveLinksContent } from './resolve_navigation_content';
import type { NavigationItems } from './to_navigation_items';

const tree = {
  id: 'es',
  body: [
    {
      id: 'dashboards',
      title: 'Dashboards',
      path: ['dashboards'],
      deepLink: { id: 'dashboards' },
    },
  ],
} as unknown as NavigationTreeDefinitionUI;

const createSection = (
  overrides: Partial<ProjectNavigationLinkListSection> = {}
): ProjectNavigationLinkListSection => ({
  kind: 'linkList',
  id: 'dashboardRecentlyViewed',
  target: 'dashboards',
  title: 'Recently viewed',
  items$: of([{ id: 'dash-1', href: '/app/dashboards#/dash-1', label: 'One' }]),
  viewAll: { href: '/app/dashboards#/list' },
  ...overrides,
});

const createMenuItem = (id: string, sections?: MenuItem['sections']): MenuItem => ({
  id,
  label: id,
  href: `/${id}`,
  iconType: 'empty',
  sections,
});

const createNavigationItems = (item: MenuItem): NavigationItems => ({
  navItems: {
    primaryItems: [item],
    overflowItems: [item],
    footerItems: [],
  },
});

describe('resolveLinksContent', () => {
  it('omits empty and errored sections', async () => {
    const empty = await firstValueFrom(
      resolveLinksContent(tree, [createSection({ items$: of([]) })])
    );
    const errored = await firstValueFrom(
      resolveLinksContent(tree, [createSection({ items$: throwError(() => new Error('fail')) })])
    );

    expect(empty).toEqual([]);
    expect(errored).toEqual([]);
  });
});

const resolveNonEmpty = async (section: ProjectNavigationLinkListSection) => {
  const [resolved] = await firstValueFrom(
    resolveLinksContent(tree, [section]).pipe(filter((sections) => sections.length > 0))
  );
  return resolved;
};

describe('attachPopoverSections', () => {
  it('attaches recents and View all to the primary and More items', async () => {
    const resolved = await resolveNonEmpty(createSection());
    const attached = attachPopoverSections(createNavigationItems(createMenuItem('dashboards')), [
      resolved,
    ]);

    expect(attached.navItems.primaryItems[0].popoverSections).toEqual([
      {
        id: 'dashboardRecentlyViewed',
        label: 'Recently viewed',
        items: [
          {
            id: 'dashboardRecentlyViewed:dash-1',
            href: '/app/dashboards#/dash-1',
            label: 'One',
          },
        ],
      },
      {
        id: 'dashboards-viewAll',
        items: [
          {
            id: 'dashboards-viewAll',
            href: '/app/dashboards#/list',
            label: 'View all',
          },
        ],
      },
    ]);
    expect(attached.navItems.overflowItems?.[0].popoverSections).toEqual(
      attached.navItems.primaryItems[0].popoverSections
    );
  });

  it('stacks lists on the same node and keeps the first View all', () => {
    const attached = attachPopoverSections(createNavigationItems(createMenuItem('dashboards')), [
      {
        id: 'dashboardRecentlyViewed',
        nodeId: 'dashboards',
        title: 'Recently viewed',
        items: [{ id: 'dash-1', href: '/app/dashboards#/dash-1', label: 'One' }],
        viewAll: { href: '/app/dashboards#/list', label: 'Overview' },
      },
      {
        id: 'dashboardFavorites',
        nodeId: 'dashboards',
        title: 'Favorites',
        items: [{ id: 'dash-2', href: '/app/dashboards#/dash-2', label: 'Two' }],
        viewAll: { href: '/app/dashboards#/other', label: 'All dashboards' },
      },
    ]);

    expect(attached.navItems.primaryItems[0].popoverSections).toEqual([
      {
        id: 'dashboardRecentlyViewed',
        label: 'Recently viewed',
        items: [{ id: 'dash-1', href: '/app/dashboards#/dash-1', label: 'One' }],
      },
      {
        id: 'dashboardFavorites',
        label: 'Favorites',
        items: [{ id: 'dash-2', href: '/app/dashboards#/dash-2', label: 'Two' }],
      },
      {
        id: 'dashboards-viewAll',
        items: [
          {
            id: 'dashboards-viewAll',
            href: '/app/dashboards#/list',
            label: 'Overview',
          },
        ],
      },
    ]);
  });

  it('does not attach onto a node that already has panel sections', async () => {
    const resolved = await resolveNonEmpty(createSection());
    const existing = [{ id: 'static', items: [{ id: 'child', label: 'Child', href: '/child' }] }];
    const attached = attachPopoverSections(
      createNavigationItems(createMenuItem('dashboards', existing)),
      [resolved]
    );

    expect(attached.navItems.primaryItems[0].popoverSections).toBeUndefined();
    expect(attached.navItems.primaryItems[0].sections).toEqual(existing);
  });
});
