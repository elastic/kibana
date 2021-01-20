/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { buildContextMenuForActions } from './build_eui_context_menu_panels';
import { Action, createAction } from '../actions';
import { PresentableGrouping } from '../util';

const createTestAction = ({
  type,
  dispayName,
  order,
  grouping = undefined,
}: {
  type?: string;
  dispayName: string;
  order?: number;
  grouping?: PresentableGrouping;
}) =>
  createAction({
    id: type as any, // mapping doesn't matter for this test
    type: type as any, // mapping doesn't matter for this test
    getDisplayName: () => dispayName,
    order,
    execute: async () => {},
    grouping,
  });

const resultMapper = (panel: EuiContextMenuPanelDescriptor) => ({
  items: panel.items
    ? panel.items.map((item) => ({ name: item.isSeparator ? 'SEPARATOR' : item.name }))
    : [],
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

  expect(result.map(resultMapper)).toMatchInlineSnapshot(`
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

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [],
      },
    ]
  `);
});

test('can build menu with one action', async () => {
  const menu = await buildContextMenuForActions({
    actions: [
      {
        action: createTestAction({
          dispayName: 'Foo',
        }),
        context: {},
        trigger: 'TETS_TRIGGER' as any,
      },
    ],
    closeMenu: () => {},
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "name": "Foo",
          },
        ],
      },
    ]
  `);
});

test('orders items according to "order" field', async () => {
  const actions = [
    createTestAction({
      order: 1,
      dispayName: 'Foo',
    }),
    createTestAction({
      order: 2,
      dispayName: 'Bar',
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: 'TEST' as any })),
  });

  expect(menu[0].items![0].name).toBe('Bar');
  expect(menu[0].items![1].name).toBe('Foo');

  const actions2 = [
    createTestAction({
      order: 2,
      dispayName: 'Bar',
    }),
    createTestAction({
      order: 1,
      dispayName: 'Foo',
    }),
  ];
  const menu2 = await buildContextMenuForActions({
    actions: actions2.map((action) => ({ action, context: {}, trigger: 'TEST' as any })),
  });

  expect(menu2[0].items![0].name).toBe('Bar');
  expect(menu2[0].items![1].name).toBe('Foo');
});

test('hides items behind in "More" submenu if there are more than 4 actions', async () => {
  const actions = [
    createTestAction({
      dispayName: 'Foo 1',
    }),
    createTestAction({
      dispayName: 'Foo 2',
    }),
    createTestAction({
      dispayName: 'Foo 3',
    }),
    createTestAction({
      dispayName: 'Foo 4',
    }),
    createTestAction({
      dispayName: 'Foo 5',
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: 'TEST' as any })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "name": "Foo 1",
          },
          Object {
            "name": "Foo 2",
          },
          Object {
            "name": "Foo 3",
          },
          Object {
            "name": "More",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "name": "Foo 4",
          },
          Object {
            "name": "Foo 5",
          },
        ],
      },
    ]
  `);
});

test('separates grouped items from main items with a separator', async () => {
  const actions = [
    createTestAction({
      dispayName: 'Foo 1',
    }),
    createTestAction({
      dispayName: 'Foo 2',
    }),
    createTestAction({
      dispayName: 'Foo 3',
    }),
    createTestAction({
      dispayName: 'Foo 4',
      grouping: [
        {
          id: 'testGroup',
          getDisplayName: () => 'Test group',
        },
      ],
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: 'TEST' as any })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "name": "Foo 1",
          },
          Object {
            "name": "Foo 2",
          },
          Object {
            "name": "Foo 3",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "name": "Foo 4",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "name": "Foo 4",
          },
        ],
      },
    ]
  `);
});

test('separates multiple groups each with its own separator', async () => {
  const actions = [
    createTestAction({
      dispayName: 'Foo 1',
    }),
    createTestAction({
      dispayName: 'Foo 2',
    }),
    createTestAction({
      dispayName: 'Foo 3',
    }),
    createTestAction({
      dispayName: 'Foo 4',
      grouping: [
        {
          id: 'testGroup',
          getDisplayName: () => 'Test group',
        },
      ],
    }),
    createTestAction({
      dispayName: 'Foo 5',
      grouping: [
        {
          id: 'testGroup2',
          getDisplayName: () => 'Test group 2',
        },
      ],
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: 'TEST' as any })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "name": "Foo 1",
          },
          Object {
            "name": "Foo 2",
          },
          Object {
            "name": "Foo 3",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "name": "Foo 4",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "name": "Foo 5",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "name": "Foo 4",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "name": "Foo 5",
          },
        ],
      },
    ]
  `);
});

test('does not add separator for first grouping if there are no main items', async () => {
  const actions = [
    createTestAction({
      dispayName: 'Foo 4',
      grouping: [
        {
          id: 'testGroup',
          getDisplayName: () => 'Test group',
        },
      ],
    }),
    createTestAction({
      dispayName: 'Foo 5',
      grouping: [
        {
          id: 'testGroup2',
          getDisplayName: () => 'Test group 2',
        },
      ],
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: 'TEST' as any })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "name": "Foo 4",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "name": "Foo 5",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "name": "Foo 4",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "name": "Foo 5",
          },
        ],
      },
    ]
  `);
});
