/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
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

  describe('validation', () => {
    const TEST_EMBEDDABLE_TYPE = 'test';
    const TestEmbeddableSchema = schema.object({
      lessThan10: schema.number({
        max: 10,
      }),
    });

    beforeAll(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../../kibana_services').embeddableService = {
        getTransforms: () => ({ getSchema: () => TestEmbeddableSchema }),
      };
    });

    it('should throw badRequest error when panel config fails validation', () => {
      const panels = [
        {
          config: {
            lessThan10: 11, // 11 is greater then 10 so validation should fail
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: TEST_EMBEDDABLE_TYPE,
          uid: 'panel1',
        },
      ];
      expect(() => transformPanelsIn(panels)).toThrowErrorMatchingInlineSnapshot(
        `"Panel config validation failed. Panel uid: panel1, type: test, validation error: [lessThan10]: Value must be equal to or lower than [10]."`
      );
    });

    it('should not throw when panel config passes validation', () => {
      const panels = [
        {
          config: {
            lessThan10: 7, // 7 is less then 10 so validation should pass
          },
          grid: {
            h: 15,
            w: 24,
            x: 0,
            y: 0,
          },
          type: TEST_EMBEDDABLE_TYPE,
        },
      ];
      const results = transformPanelsIn(panels);
      expect(JSON.parse(results.panelsJSON)[0].embeddableConfig).toMatchInlineSnapshot(`
        Object {
          "lessThan10": 7,
        }
      `);
    });
  });
});
