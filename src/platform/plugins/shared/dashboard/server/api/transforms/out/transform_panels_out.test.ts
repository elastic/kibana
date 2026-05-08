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

const mockGetTransforms = jest.fn();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../kibana_services').embeddableService = {
    getTransforms: mockGetTransforms,
  };
});

beforeEach(() => {
  mockGetTransforms.mockReset();
});

describe('transformPanelsOut', () => {
  it('should drop panels with missing sectionId', () => {
    const panelsJSON = JSON.stringify([
      {
        type: 'DASHBOARD_MARKDOWN',
        embeddableConfig: { content: 'Orphaned panel' },
        panelIndex: 'panel-1',
        gridData: {
          h: 15,
          i: 'panel-1',
          w: 24,
          x: 0,
          y: 0,
          sectionId: 'nonexistent-section',
        },
      },
    ]);

    expect(transformPanelsOut(panelsJSON, [])).toMatchInlineSnapshot(`
      Object {
        "panels": Array [],
        "warnings": Array [
          Object {
            "message": "Panel references non-existent section 'nonexistent-section'",
            "panel_config": Object {
              "content": "Orphaned panel",
            },
            "panel_type": "markdown",
            "type": "dropped_panel",
          },
        ],
      }
    `);
  });

  it('should drop panel when panel transform throws', () => {
    mockGetTransforms.mockImplementation((type: string) => {
      return {
        transformOut: () => {
          throw new Error('Simulated panel transform error');
        },
      };
    });

    const panelsJSON = JSON.stringify([
      {
        type: 'test',
        embeddableConfig: { foo: '1' },
        panelIndex: 'panel-1',
        gridData: {
          h: 15,
          w: 24,
          x: 0,
          y: 0,
        },
      },
    ]);

    expect(transformPanelsOut(panelsJSON, [])).toMatchInlineSnapshot(`
      Object {
        "panels": Array [],
        "warnings": Array [
          Object {
            "message": "Unable to transform panel config. Error: Simulated panel transform error",
            "panel_config": Object {
              "foo": "1",
            },
            "panel_references": Array [],
            "panel_type": "test",
            "type": "dropped_panel",
          },
        ],
      }
    `);
  });

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
    const panelsOut = transformPanelsOut(panelsJSON, sections);
    getDashboardStateSchema(true).validate({ title: 'My dashboard', panels: panelsOut.panels });
    expect(panelsOut).toMatchInlineSnapshot(`
      Object {
        "panels": Array [
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
            "id": "2e814ac0-33c2-4676-9d29-e1f868cddebd",
            "type": "markdown",
          },
          Object {
            "collapsed": true,
            "grid": Object {
              "y": 15,
            },
            "id": "bcebc09a-270f-42ef-8d45-daf5f5f4f511",
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
                "id": "d724d87b-2256-4c8b-8aa3-55bc0b8881c6",
                "type": "markdown",
              },
            ],
            "title": "Section 1",
          },
        ],
        "warnings": Array [],
      }
    `);
  });
});
