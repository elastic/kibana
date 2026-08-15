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
import type {
  PanelTypeMigrationContext,
  PanelTypeMigrationPanel,
} from '@kbn/embeddable-plugin/server';

const mockGetTransforms = jest.fn();
const mockGetPanelTypeMigrations = jest.fn();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../kibana_services').embeddableService = {
    getTransforms: mockGetTransforms,
    getAllEmbeddableSchemas: jest.fn().mockReturnValue({}),
    getPanelTypeMigrations: mockGetPanelTypeMigrations,
  };
});

beforeEach(() => {
  mockGetTransforms.mockReset();
  mockGetPanelTypeMigrations.mockReset();
});

describe('transformPanelsOut', () => {
  it('should drop panels with missing sectionId', async () => {
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

    expect(await transformPanelsOut(panelsJSON, [], [], false)).toMatchInlineSnapshot(`
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

  it('should drop panel when panel transform throws', async () => {
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

    expect(await transformPanelsOut(panelsJSON, [], [], false)).toMatchInlineSnapshot(`
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

  it('should drop invalid panels', async () => {
    mockGetTransforms.mockImplementation((type: string) => {
      if (type === 'DASHBOARD_MARKDOWN') {
        return {
          title: 'markdown',
          transformOut: jest.fn().mockImplementation((val) => val), // just pass the value through
          schema: {
            parse: jest.fn().mockImplementation((val) => val),
          },
        };
      }
      if (type === 'invalidPanel') {
        return {
          title: 'invalid',
          schema: {
            parse: jest.fn().mockImplementation(() => {
              throw new Error('Boo!');
            }),
          },
        };
      }
    });

    const panelsJSON = JSON.stringify([
      {
        type: 'DASHBOARD_MARKDOWN',
        embeddableConfig: { content: 'Markdown panel content' },
        panelIndex: 'panel-1',
        gridData: {
          h: 15,
          i: 'panel-1',
          w: 24,
          x: 0,
          y: 0,
        },
      },
      {
        type: 'invalidPanel',
        embeddableConfig: { invalid: true },
        panelIndex: 'panel-2',
        gridData: {
          h: 15,
          i: 'panel-2',
          w: 24,
          x: 24,
          y: 0,
        },
      },
    ]);

    expect(await transformPanelsOut(panelsJSON, [], [], false)).toMatchInlineSnapshot(`
      Object {
        "panels": Array [
          Object {
            "config": Object {
              "content": "Markdown panel content",
            },
            "grid": Object {
              "h": 15,
              "w": 24,
              "x": 0,
              "y": 0,
            },
            "id": "panel-1",
            "type": "markdown",
          },
        ],
        "warnings": Array [
          Object {
            "message": "Unable to transform panel config. Error: Boo!",
            "panel_config": Object {
              "invalid": true,
            },
            "panel_references": Array [],
            "panel_type": "invalidPanel",
            "type": "dropped_panel",
          },
        ],
      }
    `);
  });

  it('should combine panelsJSON and sections', async () => {
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
    const panelsOut = await transformPanelsOut(panelsJSON, sections, [], false);
    getDashboardStateSchema(true).parse({ title: 'My dashboard', panels: panelsOut.panels });
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

  describe('panel type migration pipeline', () => {
    const savedObjectsClient = {
      bulkGet: jest.fn(),
    } as any;

    beforeEach(() => {
      savedObjectsClient.bulkGet.mockReset();
    });

    it('replaces type and config when a migration succeeds', async () => {
      mockGetTransforms.mockImplementation((type: string) => {
        if (type === 'source' || type === 'target') {
          return {
            transformOut: jest.fn().mockImplementation((val) => val),
            schema: {
              parse: jest.fn().mockImplementation((val) => val),
            },
          };
        }
      });

      mockGetPanelTypeMigrations.mockImplementation((from: string) => {
        if (from !== 'source') return [];
        return [
          {
            from: 'source',
            to: 'target',
            migrateOut: async () => [{ panelId: 'panel-1', config: { migrated: true } }],
          },
        ];
      });

      const panelsJSON = JSON.stringify([
        {
          type: 'source',
          embeddableConfig: { foo: 'bar' },
          panelIndex: 'panel-1',
          gridData: { h: 10, w: 10, x: 0, y: 0 },
        },
      ]);

      const result = await transformPanelsOut(panelsJSON, [], [], false, false, {
        savedObjectsClient,
      });
      expect(result).toEqual({
        panels: [
          {
            config: { migrated: true },
            grid: { h: 10, w: 10, x: 0, y: 0 },
            id: 'panel-1',
            type: 'target',
          },
        ],
        warnings: [],
      });
    });

    it('drops a migrated panel when target schema validation fails', async () => {
      mockGetTransforms.mockImplementation((type: string) => {
        if (type === 'source') {
          return {
            transformOut: jest.fn().mockImplementation((val) => val),
            schema: {
              parse: jest.fn().mockImplementation((val) => val),
            },
          };
        }

        if (type === 'target') {
          return {
            schema: {
              parse: jest.fn().mockImplementation(() => {
                throw new Error('Target schema failure');
              }),
            },
          };
        }
      });

      mockGetPanelTypeMigrations.mockReturnValue([
        {
          from: 'source',
          to: 'target',
          migrateOut: async () => [{ panelId: 'panel-1', config: { migrated: true } }],
        },
      ]);

      const panelsJSON = JSON.stringify([
        {
          type: 'source',
          embeddableConfig: { foo: 'bar' },
          panelIndex: 'panel-1',
          gridData: { h: 10, w: 10, x: 0, y: 0 },
        },
      ]);

      const result = await transformPanelsOut(panelsJSON, [], [], false, false, {
        savedObjectsClient,
      });
      expect(result.panels).toEqual([]);
      expect(result.warnings[0]).toMatchObject({
        type: 'dropped_panel',
        panel_type: 'target',
        panel_config: { foo: 'bar' },
      });
    });

    it('keeps a panel unchanged when migrations omit it', async () => {
      mockGetTransforms.mockReturnValue({
        transformOut: jest.fn().mockImplementation((val) => val),
        schema: {
          parse: jest.fn().mockImplementation((val) => val),
        },
      });

      mockGetPanelTypeMigrations.mockReturnValue([
        {
          from: 'source',
          to: 'target',
          migrateOut: async () => [],
        },
      ]);

      const panelsJSON = JSON.stringify([
        {
          type: 'source',
          embeddableConfig: { foo: 'bar' },
          panelIndex: 'panel-1',
          gridData: { h: 10, w: 10, x: 0, y: 0 },
        },
      ]);

      const result = await transformPanelsOut(panelsJSON, [], [], false, false, {
        savedObjectsClient,
      });
      expect(result.panels[0]).toMatchObject({ type: 'source', config: { foo: 'bar' } });
      expect(result.warnings).toEqual([]);
    });

    it('drops a panel when a migration returns a per-panel error', async () => {
      mockGetTransforms.mockReturnValue({
        transformOut: jest.fn().mockImplementation((val) => val),
        schema: {
          parse: jest.fn().mockImplementation((val) => val),
        },
      });

      mockGetPanelTypeMigrations.mockReturnValue([
        {
          from: 'source',
          to: 'target',
          migrateOut: async () => [{ panelId: 'panel-1', error: new Error('nope') }],
        },
      ]);

      const panelsJSON = JSON.stringify([
        {
          type: 'source',
          embeddableConfig: { foo: 'bar' },
          panelIndex: 'panel-1',
          gridData: { h: 10, w: 10, x: 0, y: 0 },
        },
      ]);

      const result = await transformPanelsOut(panelsJSON, [], [], false, false, {
        savedObjectsClient,
      });
      expect(result.panels).toEqual([]);
      expect(result.warnings[0]).toMatchObject({
        type: 'dropped_panel',
        panel_type: 'source',
      });
      expect(result.warnings[0].message).toContain('Unable to migrate panel type');
    });

    it('drops a panel when multiple migrations claim it', async () => {
      mockGetTransforms.mockImplementation((type: string) => {
        if (type === 'source') {
          return {
            transformOut: jest.fn().mockImplementation((val) => val),
            schema: {
              parse: jest.fn().mockImplementation((val) => val),
            },
          };
        }
        return {
          schema: {
            parse: jest.fn().mockImplementation((val) => val),
          },
        };
      });

      mockGetPanelTypeMigrations.mockReturnValue([
        {
          from: 'source',
          to: 'target_a',
          migrateOut: async () => [{ panelId: 'panel-1', config: { a: true } }],
        },
        {
          from: 'source',
          to: 'target_b',
          migrateOut: async () => [{ panelId: 'panel-1', config: { b: true } }],
        },
      ]);

      const panelsJSON = JSON.stringify([
        {
          type: 'source',
          embeddableConfig: { foo: 'bar' },
          panelIndex: 'panel-1',
          gridData: { h: 10, w: 10, x: 0, y: 0 },
        },
      ]);

      const result = await transformPanelsOut(panelsJSON, [], [], false, false, {
        savedObjectsClient,
      });
      expect(result.panels).toEqual([]);
      expect(result.warnings[0].message).toContain(
        'Multiple panel type migrations claimed this panel'
      );
    });

    it('supports one bulkGet for multiple panels in a batch', async () => {
      mockGetTransforms.mockImplementation((type: string) => {
        if (type === 'source' || type === 'target') {
          return {
            transformOut: jest.fn().mockImplementation((val) => val),
            schema: {
              parse: jest.fn().mockImplementation((val) => val),
            },
          };
        }
      });

      mockGetPanelTypeMigrations.mockReturnValue([
        {
          from: 'source',
          to: 'target',
          migrateOut: async (
            panels: readonly PanelTypeMigrationPanel[],
            context: PanelTypeMigrationContext
          ) => {
            await context.savedObjectsClient.bulkGet(
              panels.map((p) => ({
                id: (p.config as any).savedObjectId,
                type: 'visualization',
              }))
            );
            return panels.map((p) => ({
              panelId: p.id,
              config: { spec: `from:${(p.config as any).savedObjectId}` },
            }));
          },
        },
      ]);

      const panelsJSON = JSON.stringify([
        {
          type: 'source',
          embeddableConfig: { savedObjectId: 'a' },
          panelIndex: 'panel-a',
          gridData: { h: 10, w: 10, x: 0, y: 0 },
        },
        {
          type: 'source',
          embeddableConfig: { savedObjectId: 'b' },
          panelIndex: 'panel-b',
          gridData: { h: 10, w: 10, x: 10, y: 0 },
        },
      ]);

      const result = await transformPanelsOut(panelsJSON, [], [], false, false, {
        savedObjectsClient,
      });
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(result.panels.map((p) => p.id)).toEqual(['panel-a', 'panel-b']);
    });

    it('allows a migration result to preserve a source reference identifier', async () => {
      mockGetTransforms.mockImplementation((type: string) => {
        if (type === 'source') {
          return {
            transformOut: jest.fn().mockImplementation((val) => val),
            schema: {
              parse: jest.fn().mockImplementation((val) => val),
            },
          };
        }
        if (type === 'target') {
          return {
            schema: {
              parse: jest.fn().mockImplementation((val) => val),
            },
          };
        }
      });

      mockGetPanelTypeMigrations.mockReturnValue([
        {
          from: 'source',
          to: 'target',
          migrateOut: async () => [{ panelId: 'panel-1', config: { savedObjectId: 'viz-123' } }],
        },
      ]);

      const panelsJSON = JSON.stringify([
        {
          type: 'source',
          embeddableConfig: { foo: 'bar' },
          panelIndex: 'panel-1',
          gridData: { h: 10, w: 10, x: 0, y: 0 },
        },
      ]);

      const result = await transformPanelsOut(panelsJSON, [], [], false, false, {
        savedObjectsClient,
      });
      expect(result.panels[0]).toMatchObject({
        type: 'target',
        config: { savedObjectId: 'viz-123' },
      });
    });
  });
});
