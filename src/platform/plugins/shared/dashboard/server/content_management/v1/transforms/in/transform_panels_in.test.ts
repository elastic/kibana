/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformPanelsIn } from './transform_panels_in';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('transformPanelsIn', () => {
  it('should split panels into panelsJSON and sections', () => {
    const panels = [
      {
        config: {
          content: 'Markdown panel outside sections',
        },
        grid: {
          h: 15,
          w: 24,
          x: 0,
          y: 0,
        },
        type: 'DASHBOARD_MARKDOWN',
        uid: '2e814ac0-33c2-4676-9d29-e1f868cddebd',
      },
      {
        collapsed: true,
        grid: {
          y: 15,
        },
        panels: [
          {
            config: {
              content: 'Markdown panel inside section 1',
            },
            grid: {
              h: 15,
              w: 24,
              x: 0,
              y: 0,
            },
            type: 'DASHBOARD_MARKDOWN',
            uid: 'd724d87b-2256-4c8b-8aa3-55bc0b8881c6',
          },
        ],
        title: 'Section 1',
        uid: 'bcebc09a-270f-42ef-8d45-daf5f5f4f511',
      },
    ];
    const results = transformPanelsIn(panels);
    expect(JSON.parse(results.panelsJSON)).toMatchInlineSnapshot(`
      Array [
        Object {
          "embeddableConfig": Object {
            "content": "Markdown panel outside sections",
          },
          "gridData": Object {
            "h": 15,
            "i": "2e814ac0-33c2-4676-9d29-e1f868cddebd",
            "w": 24,
            "x": 0,
            "y": 0,
          },
          "panelIndex": "2e814ac0-33c2-4676-9d29-e1f868cddebd",
          "type": "DASHBOARD_MARKDOWN",
        },
        Object {
          "embeddableConfig": Object {
            "content": "Markdown panel inside section 1",
          },
          "gridData": Object {
            "h": 15,
            "i": "d724d87b-2256-4c8b-8aa3-55bc0b8881c6",
            "sectionId": "bcebc09a-270f-42ef-8d45-daf5f5f4f511",
            "w": 24,
            "x": 0,
            "y": 0,
          },
          "panelIndex": "d724d87b-2256-4c8b-8aa3-55bc0b8881c6",
          "type": "DASHBOARD_MARKDOWN",
        },
      ]
    `);
    expect(results.sections).toMatchInlineSnapshot(`
      Array [
        Object {
          "collapsed": true,
          "gridData": Object {
            "i": "bcebc09a-270f-42ef-8d45-daf5f5f4f511",
            "y": 15,
          },
          "title": "Section 1",
        },
      ]
    `);
  });
});
