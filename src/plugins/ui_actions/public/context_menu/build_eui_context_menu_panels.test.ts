/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { buildContextMenuForActions } from './build_eui_context_menu_panels';
import { Action, createAction } from '../actions';
import { PresentableGrouping } from '@kbn/ui-actions-browser';

const createTestAction = ({
  type,
  displayName,
  order,
  grouping = undefined,
  disabled,
}: {
  type?: string;
  displayName: string;
  order?: number;
  grouping?: PresentableGrouping;
  disabled?: boolean;
}) =>
  createAction({
    id: type as string,
    type,
    getDisplayName: () => displayName,
    order,
    execute: async () => {},
    grouping,
    disabled,
  });

const resultMapper = (panel: EuiContextMenuPanelDescriptor) => ({
  items: panel.items
    ? panel.items.map((item) =>
        item.isSeparator ? { name: 'SEPARATOR' } : { name: item.name, disabled: item.disabled }
      )
    : [],
});

test('sorts items in DESC order by "order" field first, then by display name', async () => {
  const actions: Action[] = [
    createTestAction({
      order: 1,
      type: 'foo',
      displayName: 'a-1',
    }),
    createTestAction({
      order: 2,
      type: 'foo',
      displayName: 'a-2',
    }),
    createTestAction({
      order: 3,
      type: 'foo',
      displayName: 'a-3',
    }),
    createTestAction({
      order: 2,
      type: 'foo',
      displayName: 'b-2',
    }),
    createTestAction({
      order: 2,
      type: 'foo',
      displayName: 'c-2',
    }),
  ].sort(() => 0.5 - Math.random());

  const result = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: { id: '' } })),
  });

  expect(result.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "a-3",
          },
          Object {
            "disabled": undefined,
            "name": "a-2",
          },
          Object {
            "disabled": undefined,
            "name": "b-2",
          },
          Object {
            "disabled": undefined,
            "name": "More",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "c-2",
          },
          Object {
            "disabled": undefined,
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
          displayName: 'Foo',
        }),
        context: {},
        trigger: {
          id: 'TETS_TRIGGER',
        },
      },
    ],
    closeMenu: () => {},
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
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
      displayName: 'Foo',
    }),
    createTestAction({
      order: 2,
      displayName: 'Bar',
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: { id: 'TEST' } })),
  });

  expect(menu[0].items![0].name).toBe('Bar');
  expect(menu[0].items![1].name).toBe('Foo');

  const actions2 = [
    createTestAction({
      order: 2,
      displayName: 'Bar',
    }),
    createTestAction({
      order: 1,
      displayName: 'Foo',
    }),
  ];
  const menu2 = await buildContextMenuForActions({
    actions: actions2.map((action) => ({ action, context: {}, trigger: { id: 'TEST' } })),
  });

  expect(menu2[0].items![0].name).toBe('Bar');
  expect(menu2[0].items![1].name).toBe('Foo');
});

test('hides items behind in "More" submenu if there are more than 4 actions', async () => {
  const actions = [
    createTestAction({
      displayName: 'Foo 1',
    }),
    createTestAction({
      displayName: 'Foo 2',
    }),
    createTestAction({
      displayName: 'Foo 3',
    }),
    createTestAction({
      displayName: 'Foo 4',
    }),
    createTestAction({
      displayName: 'Foo 5',
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: { id: 'TEST' } })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 1",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 2",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 3",
          },
          Object {
            "disabled": undefined,
            "name": "More",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 4",
          },
          Object {
            "disabled": undefined,
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
      displayName: 'Foo 1',
    }),
    createTestAction({
      displayName: 'Foo 2',
    }),
    createTestAction({
      displayName: 'Foo 3',
    }),
    createTestAction({
      displayName: 'Foo 4',
      grouping: [
        {
          id: 'testGroup',
          getDisplayName: () => 'Test group',
        },
      ],
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: { id: 'TEST' } })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 1",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 2",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 3",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 4",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
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
      displayName: 'Foo 1',
    }),
    createTestAction({
      displayName: 'Foo 2',
    }),
    createTestAction({
      displayName: 'Foo 3',
    }),
    createTestAction({
      displayName: 'Foo 4',
      grouping: [
        {
          id: 'testGroup',
          getDisplayName: () => 'Test group',
        },
      ],
    }),
    createTestAction({
      displayName: 'Foo 5',
      grouping: [
        {
          id: 'testGroup2',
          getDisplayName: () => 'Test group 2',
        },
      ],
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: { id: 'TEST' } })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 1",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 2",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 3",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 4",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 5",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 4",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
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
      displayName: 'Foo 4',
      grouping: [
        {
          id: 'testGroup',
          getDisplayName: () => 'Test group',
        },
      ],
    }),
    createTestAction({
      displayName: 'Foo 5',
      grouping: [
        {
          id: 'testGroup2',
          getDisplayName: () => 'Test group 2',
        },
      ],
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: { id: 'TEST' } })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 4",
          },
          Object {
            "name": "SEPARATOR",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 5",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 4",
          },
        ],
      },
      Object {
        "items": Array [
          Object {
            "disabled": undefined,
            "name": "Foo 5",
          },
        ],
      },
    ]
  `);
});

test('it creates disabled actions', async () => {
  const actions = [
    createTestAction({
      displayName: 'Foo 4',
      disabled: true,
    }),
    createTestAction({
      displayName: 'Foo 5',
    }),
  ];
  const menu = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: { id: 'TEST' } })),
  });

  expect(menu.map(resultMapper)).toMatchInlineSnapshot(`
    Array [
      Object {
        "items": Array [
          Object {
            "disabled": true,
            "name": "Foo 4",
          },
          Object {
            "disabled": undefined,
            "name": "Foo 5",
          },
        ],
      },
    ]
  `);
});
