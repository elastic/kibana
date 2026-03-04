/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyDownsampling } from './apply_downsampling';

describe('applyDownsampling', () => {
  describe('queries with STATS (aggregations)', () => {
    it('should prepend SET approximation = true for queries with STATS', () => {
      const query = 'FROM logs* | STATS count() BY host';
      const result = applyDownsampling(query, 500);
      expect(result).toBe(`SET approximation = true;\n${query}`);
    });

    it('should prepend SET approximation = true for queries with STATS and no BY clause', () => {
      const query = 'FROM logs* | STATS count()';
      const result = applyDownsampling(query, 500);
      expect(result).toBe(`SET approximation = true;\n${query}`);
    });

    it('should not treat KEEP as an aggregation (KEEP is field selection, not STATS)', () => {
      const query = 'FROM logs* | KEEP host, @timestamp';
      const result = applyDownsampling(query, 500);
      expect(result).toBe('FROM logs* | KEEP host, @timestamp\n| SAMPLE 0.5');
    });
  });

  describe('queries without STATS (raw documents)', () => {
    it('should append SAMPLE when maxDataPoints < currentLimit', () => {
      const query = 'FROM logs*';
      const result = applyDownsampling(query, 500);
      expect(result).toBe('FROM logs*\n| SAMPLE 0.5');
    });

    it('should compute rate from explicit LIMIT in query', () => {
      const query = 'FROM logs* | LIMIT 10000';
      const result = applyDownsampling(query, 1000);
      expect(result).toBe('FROM logs* | LIMIT 10000\n| SAMPLE 0.1');
    });

    it('should not append SAMPLE when rate >= 1 (maxDataPoints >= limit)', () => {
      const query = 'FROM logs*';
      const result = applyDownsampling(query, 2000);
      expect(result).toBe('FROM logs*');
    });

    it('should clamp rate to minimum of 0.001', () => {
      const query = 'FROM logs* | LIMIT 10000000';
      const result = applyDownsampling(query, 1);
      expect(result).toBe('FROM logs* | LIMIT 10000000\n| SAMPLE 0.001');
    });

    it('should handle queries with WHERE clauses', () => {
      const query = 'FROM logs* | WHERE host == "server1"';
      const result = applyDownsampling(query, 100);
      expect(result).toBe('FROM logs* | WHERE host == "server1"\n| SAMPLE 0.1');
    });
  });

  describe('skip cases', () => {
    it('should return query unchanged when maxDataPoints is 0', () => {
      const query = 'FROM logs*';
      expect(applyDownsampling(query, 0)).toBe(query);
    });

    it('should return query unchanged when maxDataPoints is negative', () => {
      const query = 'FROM logs*';
      expect(applyDownsampling(query, -100)).toBe(query);
    });

    it('should return query unchanged when query is empty', () => {
      expect(applyDownsampling('', 500)).toBe('');
    });

    it('should not add SAMPLE when query already has SAMPLE', () => {
      const query = 'FROM logs* | SAMPLE 0.5';
      expect(applyDownsampling(query, 100)).toBe(query);
    });

    it('should not add SET approximation when query already has SET approximation', () => {
      const query = 'SET approximation = true;\nFROM logs* | STATS count()';
      expect(applyDownsampling(query, 500)).toBe(query);
    });

    it('should not add SAMPLE when query contains match()', () => {
      const query = 'FROM logs* | WHERE match(message, "error")';
      expect(applyDownsampling(query, 100)).toBe(query);
    });

    it('should not add SAMPLE when query contains qstr()', () => {
      const query = 'FROM logs* | WHERE qstr("message:error")';
      expect(applyDownsampling(query, 100)).toBe(query);
    });
  });
});
