/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { serializeLayout } from './serialize_layout';
import type { DashboardLayout } from './types';

describe('serializeLayout', () => {
  test('should serialize panels', () => {
    const layout = {
      panels: {
        '1': {
          grid: {
            h: 6,
            w: 6,
            x: 0,
            y: 0,
          },
          type: 'testPanelType',
        },
        '3': {
          grid: {
            h: 6,
            sectionId: 'section1',
            w: 6,
            x: 0,
            y: 0,
          },
          type: 'testPanelType',
        },
      },
      pinnedPanels: {
        control1: {
          grow: true,
          width: 'small',
          type: 'someControl',
          order: 1,
        },
        control2: {
          type: 'someOtherControl',
          order: 0,
        },
      },
      sections: {
        section1: {
          collapsed: true,
          grid: {
            y: 6,
          },
          uid: 'section1',
          title: 'Section One',
        },
      },
    } as unknown as DashboardLayout;
    const childState = {
      '1': {
        title: 'panel One',
      },
      '3': {
        title: 'panel Three',
      },
      control1: {
        selection: 'some value',
      },
      control2: {
        anotherValue: 'test',
      },
    };

    const { panels, pinned_panels } = serializeLayout(layout, childState);
    expect(panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "config": Object {
            "title": "panel One",
          },
          "grid": Object {
            "h": 6,
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
            "y": 6,
          },
          "panels": Array [
            Object {
              "config": Object {
                "title": "panel Three",
              },
              "grid": Object {
                "h": 6,
                "w": 6,
                "x": 0,
                "y": 0,
              },
              "type": "testPanelType",
              "uid": "3",
            },
          ],
          "title": "Section One",
          "uid": "section1",
        },
      ]
    `);
    expect(pinned_panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "config": Object {
            "anotherValue": "test",
          },
          "type": "someOtherControl",
          "uid": "control2",
        },
        Object {
          "config": Object {
            "selection": "some value",
          },
          "grow": true,
          "type": "someControl",
          "uid": "control1",
          "width": "small",
        },
      ]
    `);
  });
});
