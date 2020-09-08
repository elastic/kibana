/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { buildContextMenuForActions } from './build_eui_context_menu_panels';

test('builds empty menu when no actions provided', async () => {
  const menu = await buildContextMenuForActions({
    actions: [],
    closeMenu: () => {},
  });

  expect(menu).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "mainMenu",
        "items": Array [],
        "title": "Options",
      },
    ]
  `);
});

test('can build menu with one action', async () => {
  const menu = await buildContextMenuForActions({
    actions: [
      {
        action: {
          id: 'foo',
          type: 'foo' as any,
          getDisplayName: () => 'Foo',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
    ],
    closeMenu: () => {},
  });

  expect(menu).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "mainMenu",
        "items": Array [
          Object {
            "data-test-subj": "embeddablePanelAction-foo",
            "href": undefined,
            "icon": "empty",
            "name": "Foo",
            "onClick": [Function],
            "panel": undefined,
          },
        ],
        "title": "Options",
      },
    ]
  `);
});

test('orders items according to "order" field', async () => {
  const menu = await buildContextMenuForActions({
    actions: [
      {
        action: {
          id: 'foo',
          type: 'foo' as any,
          order: 1,
          getDisplayName: () => 'Foo',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
      {
        action: {
          id: 'bar',
          type: 'bar' as any,
          order: 2,
          getDisplayName: () => 'Bar',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
    ],
    closeMenu: () => {},
  });

  expect(menu[0].items![0].name).toBe('Bar');
  expect(menu[0].items![1].name).toBe('Foo');

  const menu2 = await buildContextMenuForActions({
    actions: [
      {
        action: {
          id: 'bar',
          type: 'bar' as any,
          order: 2,
          getDisplayName: () => 'Bar',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
      {
        action: {
          id: 'foo',
          type: 'foo' as any,
          order: 1,
          getDisplayName: () => 'Foo',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
    ],
    closeMenu: () => {},
  });

  expect(menu2[0].items![0].name).toBe('Bar');
  expect(menu2[0].items![1].name).toBe('Foo');
});

test('hides items behind in "More" submenu if there are more than 4 actions', async () => {
  const menu = await buildContextMenuForActions({
    actions: [
      {
        action: {
          id: 'foo1',
          type: 'foo' as any,
          order: 1,
          getDisplayName: () => 'Foo 1',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
      {
        action: {
          id: 'foo2',
          type: 'foo' as any,
          order: 1,
          getDisplayName: () => 'Foo 2',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
      {
        action: {
          id: 'foo3',
          type: 'foo' as any,
          order: 1,
          getDisplayName: () => 'Foo 3',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
      {
        action: {
          id: 'foo4',
          type: 'foo' as any,
          order: 1,
          getDisplayName: () => 'Foo 4',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
      {
        action: {
          id: 'foo5',
          type: 'foo' as any,
          order: 1,
          getDisplayName: () => 'Foo 5',
          getIconType: () => 'empty',
          isCompatible: async () => true,
          execute: async () => {},
        },
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
    ],
    closeMenu: () => {},
  });

  expect(menu).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "mainMenu",
        "items": Array [
          Object {
            "data-test-subj": "embeddablePanelAction-foo1",
            "href": undefined,
            "icon": "empty",
            "name": "Foo 1",
            "onClick": [Function],
            "panel": undefined,
          },
          Object {
            "data-test-subj": "embeddablePanelAction-foo2",
            "href": undefined,
            "icon": "empty",
            "name": "Foo 2",
            "onClick": [Function],
            "panel": undefined,
          },
          Object {
            "data-test-subj": "embeddablePanelAction-foo3",
            "href": undefined,
            "icon": "empty",
            "name": "Foo 3",
            "onClick": [Function],
            "panel": undefined,
          },
          Object {
            "icon": "boxesHorizontal",
            "name": "More",
            "panel": "mainMenu__more",
          },
        ],
        "title": "Options",
      },
      Object {
        "id": "mainMenu__more",
        "items": Array [
          Object {
            "data-test-subj": "embeddablePanelAction-foo4",
            "href": undefined,
            "icon": "empty",
            "name": "Foo 4",
            "onClick": [Function],
            "panel": undefined,
          },
          Object {
            "data-test-subj": "embeddablePanelAction-foo5",
            "href": undefined,
            "icon": "empty",
            "name": "Foo 5",
            "onClick": [Function],
            "panel": undefined,
          },
        ],
        "title": "Options",
      },
    ]
  `);
});
