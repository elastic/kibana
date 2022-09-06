/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';

describe('Significant Terms Agg', () => {
  describe('order agg editor UI', () => {
    describe('convert include/exclude from old format', () => {
      const getAggConfigs = (params: Record<string, any> = {}) => {
        const indexPattern = {
          id: '1234',
          title: 'logstash-*',
          fields: {
            getByName: () => field,
            filter: () => [field],
          },
        } as any;

        const field = {
          name: 'field',
          indexPattern,
        };

        return new AggConfigs(
          indexPattern,
          [
            {
              id: 'test',
              type: BUCKET_TYPES.SIGNIFICANT_TERMS,
              schema: 'segment',
              params,
            },
          ],
          {
            typesRegistry: mockAggTypesRegistry(),
          },
          jest.fn()
        );
      };

      const testSerializeAndWrite = (aggs: IAggConfigs) => {
        const [agg] = aggs.aggs;
        const { [BUCKET_TYPES.SIGNIFICANT_TERMS]: params } = agg.toDsl();

        expect(params.field).toBe('field');
        expect(params.include).toBe('404');
        expect(params.exclude).toBe('400');
      };

      test('produces the expected expression ast', () => {
        const aggConfigs = getAggConfigs({
          size: 'SIZE',
          field: {
            name: 'FIELD',
          },
        });
        expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
          Object {
            "chain": Array [
              Object {
                "arguments": Object {
                  "enabled": Array [
                    true,
                  ],
                  "field": Array [
                    "FIELD",
                  ],
                  "id": Array [
                    "test",
                  ],
                  "schema": Array [
                    "segment",
                  ],
                  "size": Array [
                    "SIZE",
                  ],
                },
                "function": "aggSignificantTerms",
                "type": "function",
              },
            ],
            "type": "expression",
          }
        `);
      });

      test('should generate correct label', () => {
        const aggConfigs = getAggConfigs({
          size: 'SIZE',
          field: {
            name: 'FIELD',
          },
        });
        const label = aggConfigs.aggs[0].makeLabel();

        expect(label).toBe('Top SIZE unusual terms in FIELD');
      });

      test('should doesnt do anything with string type', () => {
        const aggConfigs = getAggConfigs({
          include: '404',
          exclude: '400',
          field: {
            name: 'field',
            type: 'string',
          },
        });

        testSerializeAndWrite(aggConfigs);
      });

      test('should converts object to string type', () => {
        const aggConfigs = getAggConfigs({
          include: {
            pattern: '404',
          },
          exclude: {
            pattern: '400',
          },
          field: {
            name: 'field',
            type: 'string',
          },
        });

        testSerializeAndWrite(aggConfigs);
      });
    });
  });
});
