/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformPanelsOut } from './transform_panels_out';

describe('transformPanelsOut', () => {
  it('should combine panelsJSON and sections', () => {
    const panelsJSON =
      '[{"type":"DASHBOARD_MARKDOWN","embeddableConfig":{"content":"Markdown panel outside sections"},"panelIndex":"2e814ac0-33c2-4676-9d29-e1f868cddebd","gridData":{"i":"2e814ac0-33c2-4676-9d29-e1f868cddebd","y":0,"x":0,"w":24,"h":15}},{"type":"DASHBOARD_MARKDOWN","embeddableConfig":{"content":"Markdown panel inside section 1"},"panelIndex":"d724d87b-2256-4c8b-8aa3-55bc0b8881c6","gridData":{"i":"d724d87b-2256-4c8b-8aa3-55bc0b8881c6","y":0,"x":0,"w":24,"h":15,"sectionId":"bcebc09a-270f-42ef-8d45-daf5f5f4f511"}},{"type":"DASHBOARD_MARKDOWN","embeddableConfig":{"content":"Markdown panel inside section 2"},"panelIndex":"3e47b414-b74b-4343-b933-faf910907e02","gridData":{"i":"3e47b414-b74b-4343-b933-faf910907e02","y":0,"x":0,"w":24,"h":15,"sectionId":"4382e80b-e18a-43ac-834e-a5be4600017b"}}]';
    const sections = [
      {
        collapsed: true,
        title: 'Section 1',
        gridData: {
          i: 'bcebc09a-270f-42ef-8d45-daf5f5f4f511',
          y: 15,
        },
      },
      {
        collapsed: true,
        title: 'Section 2',
        gridData: {
          i: '4382e80b-e18a-43ac-834e-a5be4600017b',
          y: 16,
        },
      },
    ];
    expect(transformPanelsOut(panelsJSON, sections)).toMatchInlineSnapshot(`
      Array [
        Object {
          "config": Object {
            "content": "Markdown panel outside sections",
          },
          "grid": Object {
            "h": 15,
            "i": "2e814ac0-33c2-4676-9d29-e1f868cddebd",
            "w": 24,
            "x": 0,
            "y": 0,
          },
          "type": "DASHBOARD_MARKDOWN",
          "uid": "2e814ac0-33c2-4676-9d29-e1f868cddebd",
          "version": undefined,
        },
        Object {
          "collapsed": true,
          "grid": Object {
            "i": "bcebc09a-270f-42ef-8d45-daf5f5f4f511",
            "y": 15,
          },
          "panels": Array [
            Object {
              "config": Object {
                "content": "Markdown panel inside section 1",
              },
              "grid": Object {
                "h": 15,
                "i": "d724d87b-2256-4c8b-8aa3-55bc0b8881c6",
                "w": 24,
                "x": 0,
                "y": 0,
              },
              "type": "DASHBOARD_MARKDOWN",
              "uid": "d724d87b-2256-4c8b-8aa3-55bc0b8881c6",
              "version": undefined,
            },
          ],
          "title": "Section 1",
        },
        Object {
          "collapsed": true,
          "grid": Object {
            "i": "4382e80b-e18a-43ac-834e-a5be4600017b",
            "y": 16,
          },
          "panels": Array [
            Object {
              "config": Object {
                "content": "Markdown panel inside section 2",
              },
              "grid": Object {
                "h": 15,
                "i": "3e47b414-b74b-4343-b933-faf910907e02",
                "w": 24,
                "x": 0,
                "y": 0,
              },
              "type": "DASHBOARD_MARKDOWN",
              "uid": "3e47b414-b74b-4343-b933-faf910907e02",
              "version": undefined,
            },
          ],
          "title": "Section 2",
        },
      ]
    `);
  });
});
