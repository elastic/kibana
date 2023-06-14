/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser/src';
import { flattenNav, findActiveNodes } from './utils';

const getDeepLink = (id: string, path: string, title = ''): ChromeNavLink => ({
  id,
  url: `/foo/${path}`,
  href: `http://mocked/kibana/foo/${path}`,
  title,
  baseUrl: '',
});

describe('flattenNav', () => {
  test('should flatten the navigation tree', () => {
    const navTree: ChromeProjectNavigationNode[] = [
      {
        id: 'root',
        title: 'Root',
        path: ['root'],
        children: [
          {
            id: 'item1',
            title: 'Item 1',
            path: ['root', 'item1'],
          },
          {
            id: 'item2',
            title: 'Item 2',
            path: ['root', 'item2'],
          },
          {
            id: 'group1',
            title: 'Group 1',
            path: ['root', 'group1'],
            children: [
              {
                id: 'item3',
                title: 'Item 3',
                path: ['root', 'group1', 'item3'],
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
        path: ['root'],
      },
      '[0][0]': {
        id: 'item1',
        title: 'Item 1',
        path: ['root', 'item1'],
      },
      '[0][1]': {
        id: 'item2',
        title: 'Item 2',
        path: ['root', 'item2'],
      },
      '[0][2]': {
        id: 'group1',
        title: 'Group 1',
        path: ['root', 'group1'],
      },
      '[0][2][0]': {
        id: 'item3',
        title: 'Item 3',
        path: ['root', 'group1', 'item3'],
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
        path: ['root'],
      },
      '[0][0]': {
        id: 'group1',
        title: 'Group 1',
        deepLink: getDeepLink('group1', 'group1'),
        path: ['root', 'group1'],
      },
      '[0][0][0]': {
        id: 'group1A',
        title: 'Group 1A',
        path: ['root', 'group1', 'group1A'],
      },
      '[0][0][0][0]': {
        id: 'item1',
        title: 'Item 1',
        deepLink: getDeepLink('item1', 'item1'),
        path: ['root', 'group1', 'group1A', 'item1'],
      },
      '[0][1]': {
        id: 'item2',
        title: 'Item 2',
        deepLink: getDeepLink('item2', 'item2'),
        path: ['root', 'item2'],
      },
      '[0][2]': {
        id: 'group2',
        title: 'Group 2',
        path: ['root', 'group2'],
      },
      '[0][2][0]': {
        id: 'item3',
        title: 'Item 3',
        deepLink: getDeepLink('item3', 'item3'),
        path: ['root', 'group2', 'item3'],
      },
      '[0][3]': {
        id: 'group3',
        title: 'Group 3',
        path: ['root', 'group3'],
      },
      '[0][3][0]': {
        id: 'item4',
        title: 'Item 4',
        deepLink: getDeepLink('item1', 'item1'), // Same link as above, should match both
        path: ['root', 'group3', 'item4'],
      },
    };

    expect(findActiveNodes('/foo/item3', flattendNavTree)).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
        },
        {
          id: 'group2',
          title: 'Group 2',
          path: ['root', 'group2'],
        },
        {
          id: 'item3',
          title: 'Item 3',
          deepLink: getDeepLink('item3', 'item3'),
          path: ['root', 'group2', 'item3'],
        },
      ],
    ]);

    // Should match both item1 and item4
    expect(findActiveNodes('/foo/item1', flattendNavTree)).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
        },
        {
          id: 'group1',
          title: 'Group 1',
          deepLink: getDeepLink('group1', 'group1'),
          path: ['root', 'group1'],
        },
        {
          id: 'group1A',
          title: 'Group 1A',
          path: ['root', 'group1', 'group1A'],
        },
        {
          id: 'item1',
          title: 'Item 1',
          deepLink: getDeepLink('item1', 'item1'),
          path: ['root', 'group1', 'group1A', 'item1'],
        },
      ],
      [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
        },
        {
          id: 'group3',
          title: 'Group 3',
          path: ['root', 'group3'],
        },
        {
          id: 'item4',
          title: 'Item 4',
          deepLink: getDeepLink('item1', 'item1'),
          path: ['root', 'group3', 'item4'],
        },
      ],
    ]);
  });
});
