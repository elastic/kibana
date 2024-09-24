/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLocation } from 'history';
import type { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser/src';
import { flattenNav, findActiveNodes } from './utils';

const getDeepLink = (id: string, path: string, title = ''): ChromeNavLink => ({
  id,
  url: `/foo/${path}`,
  href: `http://mocked/kibana/foo/${path}`,
  title,
  baseUrl: '',
  visibleIn: ['globalSearch'],
});

describe('flattenNav', () => {
  test('should flatten the navigation tree', () => {
    const navTree: ChromeProjectNavigationNode[] = [
      {
        id: 'root',
        title: 'Root',
        path: 'root',
        children: [
          {
            id: 'item1',
            title: 'Item 1',
            path: 'root.item1',
          },
          {
            id: 'item2',
            title: 'Item 2',
            path: 'root.item2',
          },
          {
            id: 'group1',
            title: 'Group 1',
            path: 'root.group1',
            children: [
              {
                id: 'item3',
                title: 'Item 3',
                path: 'root.group1.item3',
              },
            ],
          },
        ],
      },
    ];

    const expected = {
      '[0]': {
        id: 'root',
        title: 'Root',
        path: 'root',
      },
      '[0][0]': {
        id: 'item1',
        title: 'Item 1',
        path: 'root.item1',
      },
      '[0][1]': {
        id: 'item2',
        title: 'Item 2',
        path: 'root.item2',
      },
      '[0][2]': {
        id: 'group1',
        title: 'Group 1',
        path: 'root.group1',
      },
      '[0][2][0]': {
        id: 'item3',
        title: 'Item 3',
        path: 'root.group1.item3',
      },
    };

    expect(flattenNav(navTree)).toEqual(expected);
  });
});

describe('findActiveNodes', () => {
  test('should find the active node', () => {
    const flattendNavTree: Record<string, ChromeProjectNavigationNode> = {
      '[0]': {
        id: 'root',
        title: 'Root',
        path: 'root',
      },
      '[0][0]': {
        id: 'group1',
        title: 'Group 1',
        path: 'root.group1',
      },
      '[0][0][0]': {
        id: 'item1',
        title: 'Item 1',
        deepLink: getDeepLink('item1', 'item1'),
        path: 'root.group1.item1',
      },
    };

    expect(findActiveNodes('/foo/item1', flattendNavTree)).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'group1',
          title: 'Group 1',
          path: 'root.group1',
        },
        {
          id: 'item1',
          title: 'Item 1',
          deepLink: getDeepLink('item1', 'item1'),
          path: 'root.group1.item1',
        },
      ],
    ]);
  });

  test('should find multiple active node that match', () => {
    const flattendNavTree: Record<string, ChromeProjectNavigationNode> = {
      '[0]': {
        id: 'root',
        title: 'Root',
        path: 'root',
      },
      // Group 1
      '[0][0]': {
        id: 'group1',
        title: 'Group 1',
        path: 'root.group1',
      },
      '[0][0][0]': {
        id: 'item1',
        title: 'Item 1',
        deepLink: getDeepLink('item1', 'item1'), // First match
        path: 'root.group1.item1',
      },
      // Group 2
      '[0][1]': {
        id: 'group2',
        title: 'Group 2',
        deepLink: getDeepLink('group2', 'group2'),
        path: 'root.group2',
      },
      '[0][1][0]': {
        id: 'group2A',
        title: 'Group 2A',
        path: 'root.group2.group2A',
      },
      '[0][1][0][0]': {
        id: 'item2',
        title: 'Item 2',
        // Second match --> should come first as it is the longest match of the 2
        deepLink: getDeepLink('item1', 'item1'),
        path: 'root.group2.group2A.item2',
      },
    };

    // Should match both item1 and item2
    expect(findActiveNodes('/foo/item1', flattendNavTree)).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'group2',
          title: 'Group 2',
          deepLink: getDeepLink('group2', 'group2'),
          path: 'root.group2',
        },
        {
          id: 'group2A',
          title: 'Group 2A',
          path: 'root.group2.group2A',
        },
        {
          id: 'item2',
          title: 'Item 2',
          deepLink: getDeepLink('item1', 'item1'),
          path: 'root.group2.group2A.item2',
        },
      ],
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'group1',
          title: 'Group 1',
          path: 'root.group1',
        },
        {
          id: 'item1',
          title: 'Item 1',
          deepLink: getDeepLink('item1', 'item1'),
          path: 'root.group1.item1',
        },
      ],
    ]);
  });

  test('should find the active node that contains hash routes', () => {
    const flattendNavTree: Record<string, ChromeProjectNavigationNode> = {
      '[0]': {
        id: 'root',
        title: 'Root',
        path: 'root',
      },
      '[0][1]': {
        id: 'item1',
        title: 'Item 1',
        deepLink: getDeepLink('item1', `item1#/foo/bar`),
        path: 'root.item1',
      },
    };

    expect(findActiveNodes(`/foo/item1#/foo/bar`, flattendNavTree)).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'item1',
          title: 'Item 1',
          deepLink: getDeepLink('item1', `item1#/foo/bar`),
          path: 'root.item1',
        },
      ],
    ]);
  });

  test('should find active node at the root', () => {
    const flattendNavTree: Record<string, ChromeProjectNavigationNode> = {
      '[0]': {
        id: 'root',
        title: 'Root',
        deepLink: getDeepLink('root', `root`),
        path: 'root',
      },
    };

    expect(findActiveNodes(`/foo/root`, flattendNavTree)).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          deepLink: getDeepLink('root', `root`),
          path: 'root',
        },
      ],
    ]);
  });

  test('should match the longest matching node', () => {
    const flattendNavTree: Record<string, ChromeProjectNavigationNode> = {
      '[0]': {
        id: 'root',
        title: 'Root',
        path: 'root',
      },
      '[0][1]': {
        id: 'item1',
        title: 'Item 1',
        deepLink: getDeepLink('item1', `item1#/foo`),
        path: 'root.item1',
      },
      '[0][2]': {
        id: 'item2',
        title: 'Item 2',
        deepLink: getDeepLink('item2', `item1#/foo/bar`), // Should match this one
        path: 'root.item2',
      },
    };

    expect(findActiveNodes(`/foo/item1#/foo/bar`, flattendNavTree)).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'item2',
          title: 'Item 2',
          deepLink: getDeepLink('item2', `item1#/foo/bar`),
          path: 'root.item2',
        },
      ],
    ]);
  });

  test('should match all the routes under an app root', () => {
    const flattendNavTree: Record<string, ChromeProjectNavigationNode> = {
      '[0]': {
        id: 'root',
        title: 'Root',
        path: 'root',
      },
      '[0][1]': {
        id: 'item1',
        title: 'Item 1',
        deepLink: getDeepLink('item1', `appRoot`),
        path: 'root.item1',
      },
    };

    const expected = [
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'item1',
          title: 'Item 1',
          deepLink: getDeepLink('item1', `appRoot`),
          path: 'root.item1',
        },
      ],
    ];

    expect(findActiveNodes(`/foo/appRoot`, flattendNavTree)).toEqual(expected);
    expect(findActiveNodes(`/foo/appRoot/foo`, flattendNavTree)).toEqual(expected);
    expect(findActiveNodes(`/foo/appRoot/bar`, flattendNavTree)).toEqual(expected);
    expect(findActiveNodes(`/foo/appRoot/bar?q=hello`, flattendNavTree)).toEqual(expected);
    expect(findActiveNodes(`/foo/other`, flattendNavTree)).toEqual([]);
  });

  test('should use isActive() handler if passed', () => {
    const flattendNavTree: Record<string, ChromeProjectNavigationNode> = {
      '[0]': {
        id: 'root',
        title: 'Root',
        path: 'root',
      },
      '[0][1]': {
        id: 'item1',
        title: 'Item 1',
        path: 'root.item1',
        getIsActive: ({ location }) => location.pathname.startsWith('/foo'), // Should match
      },
      '[0][2]': {
        id: 'item2',
        title: 'Item 2',
        deepLink: getDeepLink('item2', 'item2'), // Should match
        path: 'root.item2',
      },
    };

    let currentPathname = '/other/bad';

    expect(
      findActiveNodes(currentPathname, flattendNavTree, createLocation(currentPathname))
    ).toEqual([]);

    currentPathname = '/foo/item2/bar';

    expect(
      findActiveNodes(currentPathname, flattendNavTree, createLocation(currentPathname))
    ).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'item1',
          title: 'Item 1',
          getIsActive: expect.any(Function),
          path: 'root.item1',
        },
      ],
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
        },
        {
          id: 'item2',
          title: 'Item 2',
          deepLink: getDeepLink('item2', 'item2'),
          path: 'root.item2',
        },
      ],
    ]);
  });
});
