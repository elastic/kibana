/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { computeIsESQLQueryAggregating } from './compute_if_esql_query_aggregating';

describe('computeIsESQLQueryAggregating', () => {
  describe('Aggregating query', () => {
    it('should detect aggregating with STATS only', () => {
      expect(computeIsESQLQueryAggregating('from packetbeat* | stats count(agent.name)')).toBe(
        true
      );
    });
    it('should detect aggregating with STATS..BY', () => {
      expect(
        computeIsESQLQueryAggregating('from packetbeat* | stats count(agent.name) by agent.name')
      ).toBe(true);
    });
    it('should detect aggregating with multiple spaces', () => {
      expect(
        computeIsESQLQueryAggregating(
          'from packetbeat* |  stats   count(agent.name)  by agent.name'
        )
      ).toBe(true);
    });
    it('should detect aggregating case agnostic', () => {
      expect(
        computeIsESQLQueryAggregating('from packetbeat* | STATS count(agent.name) BY agent.name')
      ).toBe(true);

      expect(computeIsESQLQueryAggregating('from packetbeat* | STATS count(agent.name)')).toBe(
        true
      );
    });

    it('should detect aggregating for multiple aggregation', () => {
      expect(
        computeIsESQLQueryAggregating(
          'from packetbeat* | stats count(agent.name) by agent.name | stats distinct=count_distinct(agent.name)'
        )
      ).toBe(true);
    });
  });
  describe('Non-aggregating query', () => {
    it('should detect non-aggregating', () => {
      expect(computeIsESQLQueryAggregating('from packetbeat* | keep agent.*')).toBe(false);
    });

    it('should detect non-aggregating if word stats is part of variable name', () => {
      expect(
        computeIsESQLQueryAggregating('from packetbeat* | keep agent.some_stats | limit 10')
      ).toBe(false);
    });

    it('should detect non-aggregating if word stats is part of a path', () => {
      expect(computeIsESQLQueryAggregating('from packetbeat* | keep agent.stats | limit 10')).toBe(
        false
      );
    });
  });
});
