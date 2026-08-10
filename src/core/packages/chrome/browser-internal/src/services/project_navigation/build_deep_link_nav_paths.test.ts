/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { buildDeepLinkNavPaths } from './build_deep_link_nav_paths';

const deepLink = (id: string, title: string): ChromeNavLink =>
  ({
    id,
    title,
    baseUrl: '',
    url: `/${id}`,
    href: `/${id}`,
  } as ChromeNavLink);

const node = (
  props: Partial<ChromeProjectNavigationNode> &
    Pick<ChromeProjectNavigationNode, 'id' | 'title' | 'path'>
): ChromeProjectNavigationNode => props;

describe('buildDeepLinkNavPaths', () => {
  it('maps deep links to ancestor title chains including the leaf', () => {
    const tree = [
      node({
        id: 'admin_and_settings',
        title: 'Admin and Settings',
        path: 'admin_and_settings',
        breadcrumbStatus: 'hidden',
        children: [
          node({
            id: 'access',
            title: 'Access',
            path: 'admin_and_settings.access',
            breadcrumbStatus: 'hidden',
            children: [
              node({
                id: 'application_connections',
                title: 'Application connections',
                path: 'admin_and_settings.access.application_connections',
                deepLink: deepLink('management:application_connections', 'Application connections'),
              }),
            ],
          }),
        ],
      }),
    ];

    const paths = buildDeepLinkNavPaths(tree);

    expect(paths.get('management:application_connections')).toEqual({
      titles: ['Admin and Settings', 'Access', 'Application connections'],
      order: 0,
    });
  });

  it('inherits panelOpener icon and categoryLabel for nested deep links', () => {
    const tree = [
      node({
        id: 'applications',
        title: 'Applications',
        path: 'applications',
        renderAs: 'panelOpener',
        icon: 'spaces',
        children: [
          node({
            id: 'ux',
            title: 'User experience',
            path: 'applications.ux',
            deepLink: deepLink('ux', 'User experience'),
          }),
        ],
      }),
    ];

    expect(buildDeepLinkNavPaths(tree).get('ux')).toEqual({
      titles: ['Applications', 'User experience'],
      order: 0,
      icon: 'spaces',
      categoryLabel: 'Applications',
    });
  });

  it('uses the nearest string icon and nearest panelOpener title', () => {
    const tree = [
      node({
        id: 'applications',
        title: 'Applications',
        path: 'applications',
        renderAs: 'panelOpener',
        icon: 'spaces',
        children: [
          node({
            id: 'synthetics',
            title: 'Synthetics',
            path: 'applications.synthetics',
            icon: 'visLine',
            children: [
              node({
                id: 'monitors',
                title: 'Monitors',
                path: 'applications.synthetics.monitors',
                deepLink: deepLink('synthetics:monitors', 'Monitors'),
              }),
            ],
          }),
        ],
      }),
    ];

    expect(buildDeepLinkNavPaths(tree).get('synthetics:monitors')).toEqual({
      titles: ['Applications', 'Synthetics', 'Monitors'],
      order: 0,
      icon: 'visLine',
      categoryLabel: 'Applications',
    });
  });

  it('skips React component icons when resolving nearest icon', () => {
    const FakeIcon = () => null;
    const tree = [
      node({
        id: 'applications',
        title: 'Applications',
        path: 'applications',
        renderAs: 'panelOpener',
        icon: FakeIcon as unknown as string,
        children: [
          node({
            id: 'leaf',
            title: 'Leaf',
            path: 'applications.leaf',
            icon: 'spaces',
            deepLink: deepLink('app:leaf', 'Leaf'),
          }),
        ],
      }),
    ];

    expect(buildDeepLinkNavPaths(tree).get('app:leaf')).toEqual({
      titles: ['Applications', 'Leaf'],
      order: 0,
      icon: 'spaces',
      categoryLabel: 'Applications',
    });
  });

  it('omits icon and categoryLabel when none are present', () => {
    const tree = [
      node({
        id: 'group',
        title: 'Group',
        path: 'group',
        children: [
          node({
            id: 'leaf',
            title: 'Leaf',
            path: 'group.leaf',
            deepLink: deepLink('app:leaf', 'Leaf'),
          }),
        ],
      }),
    ];

    expect(buildDeepLinkNavPaths(tree).get('app:leaf')).toEqual({
      titles: ['Group', 'Leaf'],
      order: 0,
    });
  });

  it('skips nodes without a deep link and empty titles', () => {
    const tree = [
      node({
        id: 'group',
        title: '',
        path: 'group',
        children: [
          node({
            id: 'leaf',
            title: 'Leaf',
            path: 'group.leaf',
            deepLink: deepLink('app:leaf', 'Leaf'),
          }),
          node({
            id: 'no-link',
            title: 'No link',
            path: 'group.no-link',
          }),
        ],
      }),
    ];

    const paths = buildDeepLinkNavPaths(tree);

    expect(paths.get('app:leaf')).toEqual({ titles: ['Leaf'], order: 0 });
    expect(paths.size).toBe(1);
  });

  it('keeps the first DFS hit when a deep link appears twice', () => {
    const tree = [
      node({
        id: 'first',
        title: 'First',
        path: 'first',
        deepLink: deepLink('app:dup', 'Dup'),
      }),
      node({
        id: 'second',
        title: 'Second',
        path: 'second',
        deepLink: deepLink('app:dup', 'Dup'),
      }),
    ];

    expect(buildDeepLinkNavPaths(tree).get('app:dup')).toEqual({ titles: ['First'], order: 0 });
  });

  it('assigns DFS order across deep links', () => {
    const tree = [
      node({
        id: 'a',
        title: 'A',
        path: 'a',
        deepLink: deepLink('app:a', 'A'),
      }),
      node({
        id: 'b',
        title: 'B',
        path: 'b',
        deepLink: deepLink('app:b', 'B'),
      }),
    ];

    const paths = buildDeepLinkNavPaths(tree);
    expect(paths.get('app:a')?.order).toBe(0);
    expect(paths.get('app:b')?.order).toBe(1);
  });

  it('normalizes renderAs home to Home title and home icon', () => {
    const tree = [
      node({
        id: 'overview',
        title: 'Observability',
        path: 'overview',
        renderAs: 'home',
        icon: 'logoObservability',
        deepLink: deepLink('observability-overview', 'Observability'),
      }),
    ];

    expect(buildDeepLinkNavPaths(tree).get('observability-overview')).toEqual({
      titles: ['Home'],
      order: 0,
      icon: 'home',
    });
  });
});
