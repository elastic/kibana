/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLStatsQueryMeta } from './parse_esql';

describe('esql query utils', () => {
  describe('getStatsGroupByColumnsFromQuery', () => {
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
      expect(result.groupByFields).toEqual(['type', 'url.keyword']);
      expect(result.appliedFunctions).toEqual([
        { identifier: 'Visits', operator: 'COUNT' },
        { identifier: 'Unique', operator: 'COUNT_DISTINCT' },
        { identifier: 'p95', operator: 'PERCENTILE' },
        { identifier: 'median', operator: 'MEDIAN' },
      ]);
    });
  });
});
