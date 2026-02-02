/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { stripUnmappedKeys, throwOnUnmappedKeys } from './scope_tooling';
import type { DashboardState } from './types';

const mockGetTransforms = jest.fn();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../kibana_services').embeddableService = {
    getTransforms: mockGetTransforms,
  };
});

beforeEach(() => {
  mockGetTransforms.mockReset();
});

describe('stripUnmappedKeys', () => {
  it('should not drop mapped panel types', () => {
    mockGetTransforms.mockImplementation(() => {
      return {
        getSchema: () =>
          schema.object({
            foo: schema.string(),
          }),
      };
    });
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            foo: 'some value',
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithSchema',
        },
      ],
    };
    expect(stripUnmappedKeys(dashboardState)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "panels": Array [
            Object {
              "config": Object {
                "foo": "some value",
              },
              "grid": Object {
                "h": 15,
                "w": 24,
                "x": 0,
                "y": 0,
              },
              "type": "typeWithSchema",
            },
          ],
          "title": "my dashboard",
        },
        "warnings": Array [],
      }
    `);
  });

  it('should drop unmapped panel types', () => {
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            foo: 'some value',
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithoutSchema',
          uid: '12345',
        },
      ],
    };
    expect(stripUnmappedKeys(dashboardState)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "panels": Array [],
          "title": "my dashboard",
        },
        "warnings": Array [
          "Dropped panel 12345, panel schema not available for panel type: typeWithoutSchema. Panels without schemas are not supported by dashboard REST endpoints",
        ],
      }
    `);
  });

  it('should drop unmapped panel types when throwOnUnmappedPanel throws', () => {
    mockGetTransforms.mockImplementation(() => {
      return {
        getSchema: () => schema.any(),
        throwOnUnmappedPanel: () => {
          throw new Error('Unmapped panel type');
        },
      };
    });
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            foo: 'some value',
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithSchema',
          uid: '12345',
        },
      ],
    };
    expect(stripUnmappedKeys(dashboardState)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "panels": Array [],
          "title": "my dashboard",
        },
        "warnings": Array [
          "Dropped panel 12345, panel config is not supported. Reason: Unmapped panel type.",
        ],
      }
    `);
  });

  it('should drop panel enhancements', () => {
    mockGetTransforms.mockImplementation(() => {
      return {
        getSchema: () =>
          schema.object({
            foo: schema.string(),
          }),
      };
    });
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            title: 'panel',
            enhancements: {
              dynamicActions: {
                events: [],
              },
            },
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithSchema',
          uid: 'panel1',
        },
        {
          grid: { y: 0 },
          panels: [
            {
              config: {
                title: 'panel in section',
                enhancements: {
                  dynamicActions: {
                    events: [{}],
                  },
                },
              },
              grid: {
                h: 15,
                w: 24,
                x: 0,
                y: 0,
              },
              type: 'typeWithSchema',
              uid: 'panelInSection1',
            },
          ],
          title: 'section 1',
        },
      ],
    };
    expect(stripUnmappedKeys(dashboardState)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "panels": Array [
            Object {
              "config": Object {
                "title": "panel",
              },
              "grid": Object {
                "h": 15,
                "w": 24,
                "x": 0,
                "y": 0,
              },
              "type": "typeWithSchema",
              "uid": "panel1",
            },
            Object {
              "grid": Object {
                "y": 0,
              },
              "panels": Array [
                Object {
                  "config": Object {
                    "title": "panel in section",
                  },
                  "grid": Object {
                    "h": 15,
                    "w": 24,
                    "x": 0,
                    "y": 0,
                  },
                  "type": "typeWithSchema",
                  "uid": "panelInSection1",
                },
              ],
              "title": "section 1",
            },
          ],
          "title": "my dashboard",
        },
        "warnings": Array [
          "Dropped unmapped panel config key 'enhancements' from panel panelInSection1",
        ],
      }
    `);
  });

  it('should drop pinned_panels', () => {
    const dashboardState = {
      pinned_panels: {} as unknown as DashboardState['pinned_panels'],
      title: 'my dashboard',
    };
    expect(stripUnmappedKeys(dashboardState)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "panels": Array [],
          "title": "my dashboard",
        },
        "warnings": Array [
          "Dropped unmapped key 'pinned_panels' from dashboard",
        ],
      }
    `);
  });
});

describe('throwOnUnmappedKeys', () => {
  it('should not throw when there are no unmapped keys', () => {
    mockGetTransforms.mockImplementation(() => {
      return {
        getSchema: () =>
          schema.object({
            foo: schema.string(),
          }),
      };
    });
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            foo: 'some value',
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithSchema',
        },
      ],
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).not.toThrow();
  });

  it('should throw when dashboard contains a panel without a schema', () => {
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            foo: 'some value',
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithoutSchema',
        },
      ],
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).toThrow();
  });

  it('should throw when dashboard contains a panel with enhancements', () => {
    mockGetTransforms.mockImplementation(() => {
      return {
        getSchema: () => schema.object({}),
      };
    });
    const dashboardState = {
      title: 'my dashboard',
      panels: [
        {
          config: {
            enhancements: {},
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: 'typeWithSchema',
        },
      ],
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).toThrow();
  });

  it('should throw when dashboard contains pinned_panels', () => {
    const dashboardState = {
      pinned_panels: {} as unknown as DashboardState['pinned_panels'],
      title: 'my dashboard',
    };
    expect(() => throwOnUnmappedKeys(dashboardState)).toThrow();
  });
});
