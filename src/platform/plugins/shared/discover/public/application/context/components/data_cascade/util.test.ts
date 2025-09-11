/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLStatsQueryMeta, constructCascadeQuery } from './util';

describe('utils', () => {
  describe('getESQLStatsQueryMeta', () => {
    it('should return an array of the columns the query has been denoted to be grouped by with the STATS command', () => {
      const queryString = `
    FROM kibana_sample_data_logs, another_index
    | KEEP bytes, clientip, url.keyword, response.keyword
    | STATS Visits = COUNT(), Unique = COUNT_DISTINCT(clientip),
        p95 = PERCENTILE(bytes, 95), median = MEDIAN(bytes)
            BY type, url.keyword
    | EVAL total_records = TO_DOUBLE(count_4xx + count_5xx + count_rest)
    | DROP count_4xx, count_rest, total_records
    | LIMIT 123`;

      const result = getESQLStatsQueryMeta(queryString);
      expect(result.groupByFields).toEqual([
        {
          field: 'type',
          type: 'column',
        },
        {
          field: 'url.keyword',
          type: 'column',
        },
      ]);
      expect(result.appliedFunctions).toEqual([
        { identifier: 'Visits', operator: 'COUNT' },
        { identifier: 'Unique', operator: 'COUNT_DISTINCT' },
        { identifier: 'p95', operator: 'PERCENTILE' },
        { identifier: 'median', operator: 'MEDIAN' },
      ]);
    });

    it('should return the appropriate metadata when there are multiple stats commands in the query', () => {
      const queryString = `
        FROM kibana_sample_data_logs
        // First aggregate per client + per URL
        | STATS
            visits_per_client =
              COUNT(), // how many hits this client made to this URL
            p95_bytes_client =
              PERCENTILE(bytes, 95), // 95th percentile of bytes for this client+URL
            median_bytes_client =
              MEDIAN(bytes) // median of bytes for this client+URL
              BY url.keyword, clientip
        // Now roll up those per-client stats to the URL level
        | STATS
            unique_visitors =
              COUNT_DISTINCT(clientip), // how many distinct clients hit this URL
            total_visits =
              SUM(visits_per_client), // median across client-level medians
            p95_bytes_url =
              PERCENTILE(p95_bytes_client, 95), // 95th percentile across client-level p95s
            median_bytes_url =
              MEDIAN(median_bytes_client) // median across client-level medians
              BY url.keyword
        // Sort to see the busiest URLs on top
        | SORT total_visits DESC
      `;

      const result = getESQLStatsQueryMeta(queryString);

      expect(result.groupByFields).toEqual([
        {
          field: 'url.keyword',
          type: 'column',
        },
      ]);
      expect(result.appliedFunctions).toEqual([
        { identifier: 'unique_visitors', operator: 'COUNT_DISTINCT' },
        { identifier: 'total_visits', operator: 'SUM' },
        { identifier: 'p95_bytes_url', operator: 'PERCENTILE' },
        { identifier: 'median_bytes_url', operator: 'MEDIAN' },
      ]);
    });

    it(`should return the correct metadata when the stats query provides functions as the by option`, () => {
      const queryString = `FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY BUCKET(@timestamp, 1 hour), ABS(bytes)`;

      const result = getESQLStatsQueryMeta(queryString);

      expect(result.groupByFields).toEqual([
        {
          field: 'BUCKET(@timestamp, 1 hour)',
          type: 'bucket',
        },
        {
          field: 'ABS(bytes)',
          type: 'abs',
        },
      ]);
      expect(result.appliedFunctions).toEqual([{ identifier: 'var0', operator: 'AVG' }]);
    });
  });

  describe('constructCascadeQuery', () => {
    describe('query with single stats command', () => {
      describe('column options', () => {
        describe('group queries', () => {
          it('returns the query without a limit when a group query is requested but there is only one column specified for the stats by option?', () => {
            const editorQuery = {
              esql: `
          FROM kibana_sample_data_logs
          | STATS count() BY clientip
          | LIMIT 100
          `,
            };

            const nodeType = 'group';
            const nodePath = ['clientip'];
            const nodePathMap = { clientip: '192.168.1.1' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toEqual({
              esql: 'FROM kibana_sample_data_logs | STATS COUNT() BY clientip',
            });
          });

          it('returns a valid group query, when one is requested in an instance where the editor query has multiple columns specified for the stats by option', () => {
            const editorQuery = {
              esql: `
          FROM kibana_sample_data_logs
          | STATS count() BY clientip, url.keyword
          | LIMIT 100
          `,
            };

            const nodeType = 'group';
            const nodePath = ['clientip', 'url.keyword'];
            const nodePathMap = { clientip: '192.168.1.1' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toEqual({
              esql: 'FROM kibana_sample_data_logs | WHERE clientip == "192.168.1.1" | STATS COUNT() BY url.keyword',
            });
          });
        });

        describe('leaf queries', () => {
          it('should construct a valid cascade leaf query for a query with just one column', () => {
            const editorQuery = {
              esql: `
          FROM kibana_sample_data_logs
          | STATS count() BY clientip
          | LIMIT 100
          `,
            };

            const nodeType = 'leaf';
            const nodePath = ['clientip'];
            const nodePathMap = { clientip: '192.168.1.1' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toEqual({
              esql: 'FROM kibana_sample_data_logs | WHERE clientip == "192.168.1.1"',
            });
          });
        });
      });
    });
  });
});
