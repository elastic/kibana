/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import {
  BooleanRelation,
  buildEmptyFilter,
  buildCombinedFilter,
  FilterMeta,
  RangeFilter,
} from '@kbn/es-query';
import { mapCombined } from './map_combined';

describe('filter manager utilities', () => {
  describe('mapCombined()', () => {
    test('should throw if not a combinedFilter', async () => {
      const filter = buildEmptyFilter(true);
      try {
        mapCombined(filter);
      } catch (e) {
        expect(e).toBe(filter);
      }
    });

    test('should call mapFilter for sub-filters', async () => {
      const rangeFilter = {
        meta: { index: 'logstash-*' } as FilterMeta,
        query: { range: { bytes: { lt: 2048, gt: 1024 } } },
      } as RangeFilter;
      const filter = buildCombinedFilter(BooleanRelation.AND, [rangeFilter], {
        id: 'logstash-*',
      } as DataView);
      const result = mapCombined(filter);

      expect(result).toMatchInlineSnapshot(`
        Object {
          "key": undefined,
          "params": Array [
            Object {
              "meta": Object {
                "alias": undefined,
                "disabled": false,
                "index": "logstash-*",
                "key": "bytes",
                "negate": false,
                "params": Object {
                  "gt": 1024,
                  "lt": 2048,
                },
                "type": "range",
                "value": Object {
                  "gt": 1024,
                  "lt": 2048,
                },
              },
              "query": Object {
                "range": Object {
                  "bytes": Object {
                    "gt": 1024,
                    "lt": 2048,
                  },
                },
              },
            },
          ],
          "type": "combined",
        }
      `);
    });
  });
});
