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
import { Action, createAction } from '../actions';

const createTestAction = ({
  type,
  dispayName,
  order,
}: {
  type: string;
  dispayName: string;
  order: number;
}) =>
  createAction({
    type: type as any, // mapping doesn't matter for this test
    getDisplayName: () => dispayName,
    order,
    execute: async () => {},
  });

test('sorts items in DESC order by "order" field first, then by display name', async () => {
  const actions: Action[] = [
    createTestAction({
      order: 1,
      type: 'foo',
      dispayName: 'a-1',
    }),
    createTestAction({
      order: 2,
      type: 'foo',
      dispayName: 'a-2',
    }),
    createTestAction({
      order: 3,
      type: 'foo',
      dispayName: 'a-3',
    }),
    createTestAction({
      order: 2,
      type: 'foo',
      dispayName: 'b-2',
    }),
    createTestAction({
      order: 2,
      type: 'foo',
      dispayName: 'c-2',
    }),
  ].sort(() => 0.5 - Math.random());

  const result = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: '' as any })),
  });

  expect(
    result.map((panel) => ({
      items: panel.items ? panel.items.map((item) => ({ name: item.name })) : [],
    }))
  ).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "name": "a-3",
          },
          Object {
            "name": "a-2",
          },
          Object {
            "name": "b-2",
          },
          Object {
            "name": "More",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "name": "c-2",
          },
          Object {
            "name": "a-1",
          },
        ],
      },
    ]
  `);
});

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
            "data-test-subj": "embeddablePanelMore-mainMenu",
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
