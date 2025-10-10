/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
      () => []
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
    expect(childState).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "rawState": Object {
            "title": "panel One",
          },
          "references": Array [],
        },
        "3": Object {
          "rawState": Object {
            "title": "panel Three",
          },
          "references": Array [],
        },
      }
    `);
  });
});
