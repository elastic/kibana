/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { serializeLayout } from './serialize_layout';

describe('serializeLayout', () => {
  test('should serialize panels', () => {
    const layout = {
      panels: {
        '1': {
          grid: {
            h: 6,
            i: '1',
            w: 6,
            x: 0,
            y: 0,
          },
          type: 'testPanelType',
        },
        '3': {
          grid: {
            h: 6,
            i: '3',
            sectionId: 'section1',
            w: 6,
            x: 0,
            y: 0,
          },
          type: 'testPanelType',
        },
      },
      sections: {
        section1: {
          collapsed: true,
          grid: {
            i: 'section1',
            y: 6,
          },
          title: 'Section One',
        },
      },
    };
    const childState = {
      '1': {
        rawState: {
          title: 'panel One',
        },
        references: [
          {
            name: 'myRef',
            id: 'ref1',
            type: 'testRefType',
          },
        ],
      },
      '3': {
        rawState: {
          title: 'panel Three',
        },
        references: [],
      },
    };

    const { panels, references } = serializeLayout(layout, childState);
    expect(panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "config": Object {
            "title": "panel One",
          },
          "grid": Object {
            "h": 6,
            "i": "1",
            "w": 6,
            "x": 0,
            "y": 0,
          },
          "type": "testPanelType",
          "uid": "1",
        },
        Object {
          "collapsed": true,
          "grid": Object {
            "i": "section1",
            "y": 6,
          },
          "panels": Array [
            Object {
              "config": Object {
                "title": "panel Three",
              },
              "grid": Object {
                "h": 6,
                "i": "3",
                "w": 6,
                "x": 0,
                "y": 0,
              },
              "type": "testPanelType",
              "uid": "3",
            },
          ],
          "title": "Section One",
        },
      ]
    `);
    expect(references).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "ref1",
          "name": "1:myRef",
          "type": "testRefType",
        },
      ]
    `);
  });
});
