/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PinnedControlState } from '@kbn/controls-schemas';
import { deserializeLayout } from './deserialize_layout';

describe('deserializeLayout', () => {
  test('should deserialize panels', () => {
    const { layout, childState } = deserializeLayout(
      [
        {
          grid: { x: 0, y: 0, w: 6, h: 6 },
          config: { title: 'panel One' },
          uid: '1',
          type: 'testPanelType',
        },
        {
          title: 'Section One',
          collapsed: true,
          grid: {
            y: 6,
          },
          uid: 'section1',
          panels: [
            {
              grid: { x: 0, y: 0, w: 6, h: 6 },
              config: { title: 'panel Three' },
              uid: '3',
              type: 'testPanelType',
            },
          ],
        },
      ],
      [
        {
          uid: 'control1',
          type: 'someType',
          width: 'small',
          grow: true,
          config: { someValue: 'test' },
        } as unknown as PinnedControlState,
        {
          uid: 'control2',
          type: 'anotherType',
          config: { anotherValue: 1 },
        } as unknown as PinnedControlState,
      ]
    );
    expect(layout.panels).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "grid": Object {
            "h": 6,
            "w": 6,
            "x": 0,
            "y": 0,
          },
          "type": "testPanelType",
        },
        "3": Object {
          "grid": Object {
            "h": 6,
            "sectionId": "section1",
            "w": 6,
            "x": 0,
            "y": 0,
          },
          "type": "testPanelType",
        },
      }
    `);
    expect(layout.sections).toMatchInlineSnapshot(`
      Object {
        "section1": Object {
          "collapsed": true,
          "grid": Object {
            "y": 6,
          },
          "title": "Section One",
        },
      }
    `);
    expect(layout.pinnedPanels).toMatchInlineSnapshot(`
      Object {
        "control1": Object {
          "grow": true,
          "order": 0,
          "type": "someType",
          "width": "small",
        },
        "control2": Object {
          "grow": undefined,
          "order": 1,
          "type": "anotherType",
          "width": undefined,
        },
      }
    `);
    expect(childState).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "title": "panel One",
        },
        "3": Object {
          "title": "panel Three",
        },
        "control1": Object {
          "someValue": "test",
        },
        "control2": Object {
          "anotherValue": 1,
        },
      }
    `);
  });
});
