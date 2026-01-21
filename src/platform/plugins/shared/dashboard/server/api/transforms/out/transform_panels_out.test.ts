/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDashboardStateSchema } from '../../dashboard_state_schemas';
import { transformPanelsOut } from './transform_panels_out';

describe('transformPanelsOut', () => {
  it('should combine panelsJSON and sections', () => {
    const panelsJSON =
      '[{"type":"DASHBOARD_MARKDOWN","embeddableConfig":{"content":"Markdown panel outside sections"},"panelIndex":"2e814ac0-33c2-4676-9d29-e1f868cddebd","gridData":{"h":15,"i":"2e814ac0-33c2-4676-9d29-e1f868cddebd","w":24,"x":0,"y":0}},{"type":"DASHBOARD_MARKDOWN","embeddableConfig":{"content":"Markdown panel inside section 1"},"panelIndex":"d724d87b-2256-4c8b-8aa3-55bc0b8881c6","gridData":{"h":15,"i":"d724d87b-2256-4c8b-8aa3-55bc0b8881c6","w":24,"x":0,"y":0,"sectionId":"bcebc09a-270f-42ef-8d45-daf5f5f4f511"}}]';
    const sections = [
      {
        collapsed: true,
        title: 'Section 1',
        gridData: {
          i: 'bcebc09a-270f-42ef-8d45-daf5f5f4f511',
          y: 15,
        },
      },
    ];
    const panels = transformPanelsOut(panelsJSON, sections);
    getDashboardStateSchema().validate({ title: '', panels });
    expect(panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "config": Object {
            "content": "Markdown panel outside sections",
          },
          "grid": Object {
            "h": 15,
            "w": 24,
            "x": 0,
            "y": 0,
          },
          "type": "DASHBOARD_MARKDOWN",
          "uid": "2e814ac0-33c2-4676-9d29-e1f868cddebd",
        },
        Object {
          "collapsed": true,
          "grid": Object {
            "y": 15,
          },
          "panels": Array [
            Object {
              "config": Object {
                "content": "Markdown panel inside section 1",
              },
              "grid": Object {
                "h": 15,
                "w": 24,
                "x": 0,
                "y": 0,
              },
              "type": "DASHBOARD_MARKDOWN",
              "uid": "d724d87b-2256-4c8b-8aa3-55bc0b8881c6",
            },
          ],
          "title": "Section 1",
          "uid": "bcebc09a-270f-42ef-8d45-daf5f5f4f511",
        },
      ]
    `);
  });
});
