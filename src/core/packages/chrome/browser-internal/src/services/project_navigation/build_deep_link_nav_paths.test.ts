/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

    expect(paths.get('management:application_connections')).toEqual([
      'Admin and Settings',
      'Access',
      'Application connections',
    ]);
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

    expect(paths.get('app:leaf')).toEqual(['Leaf']);
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

    expect(buildDeepLinkNavPaths(tree).get('app:dup')).toEqual(['First']);
  });
});
