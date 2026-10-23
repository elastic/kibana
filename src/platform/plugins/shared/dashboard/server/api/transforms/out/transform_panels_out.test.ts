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
const mockGetPanelTypeMigration = jest.fn();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../kibana_services').embeddableService = {
    getTransforms: mockGetTransforms,
    getAllEmbeddableSchemas: jest.fn().mockReturnValue({}),
    getPanelTypeMigration: mockGetPanelTypeMigration,
  };
});

beforeEach(() => {
  mockGetTransforms.mockReset();
  mockGetPanelTypeMigration.mockReset();
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

    expect(transformPanelsOut(panelsJSON, [], [], false)).toMatchInlineSnapshot(`
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

    expect(transformPanelsOut(panelsJSON, [], [], false)).toMatchInlineSnapshot(`
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

  it('should drop invalid panels', () => {
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

    expect(transformPanelsOut(panelsJSON, [], [], false)).toMatchInlineSnapshot(`
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
    const panelsOut = transformPanelsOut(panelsJSON, sections, [], false);
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

  describe('panel type migrations', () => {
    const passThroughSchema = { parse: (config: unknown) => config };
    const panelsJSON = JSON.stringify([
      {
        type: 'source',
        embeddableConfig: { foo: 'bar' },
        panelIndex: 'panel-1',
        gridData: { h: 10, i: 'panel-1', w: 10, x: 0, y: 0 },
      },
    ]);

    beforeEach(() => {
      mockGetTransforms.mockImplementation((type: string) =>
        type === 'source' || type === 'target' ? { schema: passThroughSchema } : undefined
      );
    });

    it('replaces type and config when a migration succeeds', () => {
      const migrateOut = jest.fn().mockReturnValue({ type: 'target', config: { migrated: true } });
      mockGetPanelTypeMigration.mockImplementation((from: string) =>
        from === 'source' ? { from, migrateOut } : undefined
      );

      expect(transformPanelsOut(panelsJSON, [], [], false, true)).toEqual({
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
      expect(migrateOut).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('does not migrate panels when migratePanelTypes is false', () => {
      const migrateOut = jest.fn();
      mockGetPanelTypeMigration.mockReturnValue({ from: 'source', migrateOut });

      const result = transformPanelsOut(panelsJSON, [], [], false);
      expect(migrateOut).not.toHaveBeenCalled();
      expect(result.panels).toEqual([expect.objectContaining({ type: 'source' })]);
    });

    it('keeps a panel unchanged when the migration returns undefined', () => {
      mockGetPanelTypeMigration.mockReturnValue({ from: 'source', migrateOut: () => undefined });

      const result = transformPanelsOut(panelsJSON, [], [], false, true);
      expect(result.panels).toEqual([
        expect.objectContaining({ type: 'source', config: { foo: 'bar' } }),
      ]);
      expect(result.warnings).toEqual([]);
    });

    it('drops a panel when the migration throws', () => {
      mockGetPanelTypeMigration.mockReturnValue({
        from: 'source',
        migrateOut: () => {
          throw new Error('migration failed');
        },
      });

      expect(transformPanelsOut(panelsJSON, [], [], false, true)).toEqual({
        panels: [],
        warnings: [
          {
            type: 'dropped_panel',
            panel_type: 'source',
            panel_config: { foo: 'bar' },
            panel_references: [],
            message: 'Unable to transform panel config. Error: migration failed',
          },
        ],
      });
    });

    it('drops a migrated panel when target schema validation fails', () => {
      mockGetTransforms.mockImplementation((type: string) =>
        type === 'target'
          ? {
              schema: {
                parse: () => {
                  throw new Error('Target schema failure');
                },
              },
            }
          : { schema: passThroughSchema }
      );
      mockGetPanelTypeMigration.mockReturnValue({
        from: 'source',
        migrateOut: () => ({ type: 'target', config: { migrated: true } }),
      });

      const result = transformPanelsOut(panelsJSON, [], [], false, true);
      expect(result.panels).toEqual([]);
      expect(result.warnings).toEqual([
        expect.objectContaining({
          message: 'Unable to transform panel config. Error: Target schema failure',
        }),
      ]);
    });

    it('keeps a migrated panel without validation when the target type has no schema', () => {
      mockGetPanelTypeMigration.mockReturnValue({
        from: 'source',
        migrateOut: () => ({ type: 'unregistered', config: { migrated: true } }),
      });

      const result = transformPanelsOut(panelsJSON, [], [], false, true);
      expect(result.panels).toEqual([
        expect.objectContaining({ type: 'unregistered', config: { migrated: true } }),
      ]);
      expect(result.warnings).toEqual([]);
    });
  });
});
