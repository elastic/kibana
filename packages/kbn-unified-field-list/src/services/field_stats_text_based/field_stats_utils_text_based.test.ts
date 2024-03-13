/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { buildSearchFilter, fetchAndCalculateFieldStats } from './field_stats_utils_text_based';

describe('fieldStatsUtilsTextBased', function () {
  describe('buildSearchFilter()', () => {
    it('should create a time range filter', () => {
      expect(
        buildSearchFilter({
          timeFieldName: 'timestamp',
          fromDate: '2022-12-05T23:00:00.000Z',
          toDate: '2023-01-05T09:33:05.359Z',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "range": Object {
            "timestamp": Object {
              "format": "strict_date_optional_time",
              "gte": "2022-12-05T23:00:00.000Z",
              "lte": "2023-01-05T09:33:05.359Z",
            },
          },
        }
      `);
    });
    it('should not create a time range filter', () => {
      expect(
        buildSearchFilter({
          timeFieldName: undefined,
          fromDate: '2022-12-05T23:00:00.000Z',
          toDate: '2023-01-05T09:33:05.359Z',
        })
      ).toBeNull();
    });
  });

  describe('fetchAndCalculateFieldStats()', () => {
    it('should provide top values', async () => {
      const searchHandler = jest.fn().mockResolvedValue({
        values: [
          [3, 'a'],
          [1, 'b'],
        ],
      });
      expect(
        await fetchAndCalculateFieldStats({
          searchHandler,
          esqlBaseQuery: 'from logs* | limit 1000',
          field: { name: 'message', type: 'string', esTypes: ['keyword'] } as DataViewField,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "sampledDocuments": 4,
          "sampledValues": 4,
          "topValues": Object {
            "buckets": Array [
              Object {
                "count": 3,
                "key": "a",
              },
              Object {
                "count": 1,
                "key": "b",
              },
            ],
          },
          "totalDocuments": 4,
        }
      `);

      expect(searchHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          query:
            'from logs* | limit 1000| STATS `message_terms` = count(`message`) BY `message`\n    | LIMIT 10\n    | SORT `message_terms` DESC',
        })
      );
    });

    it('should provide text examples', async () => {
      const searchHandler = jest.fn().mockResolvedValue({
        values: [['a', 'b', 'c'], ['b'], ['a', 'b']],
      });
      expect(
        await fetchAndCalculateFieldStats({
          searchHandler,
          esqlBaseQuery: 'from logs* | limit 1000',
          field: { name: 'message', type: 'string', esTypes: ['text'] } as DataViewField,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "sampledDocuments": 3,
          "sampledValues": 6,
          "topValues": Object {
            "areExamples": true,
            "buckets": Array [
              Object {
                "count": 3,
                "key": "b",
              },
              Object {
                "count": 2,
                "key": "a",
              },
              Object {
                "count": 1,
                "key": "c",
              },
            ],
          },
          "totalDocuments": 3,
        }
      `);

      expect(searchHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'from logs* | limit 1000| KEEP `message`\n    | LIMIT 100',
        })
      );
    });
  });
});
