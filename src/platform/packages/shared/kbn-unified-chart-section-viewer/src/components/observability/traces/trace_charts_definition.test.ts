/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getErrorRateChart, getLatencyChart, getThroughputChart } from './trace_charts_definition';
import { chartPalette } from '.';

describe('trace_charts_definition', () => {
  const mockIndexes = 'traces-*';
  const mockFilters = ['service.name == "test-service"', 'environment == "production"'];
  const mockInvalidFilters = ['service.name:test-service'];
  const unmappedFieldsPrefix = 'SET unmapped_fields="NULLIFY";';

  describe('getErrorRateChart', () => {
    it('should return error rate chart configuration', () => {
      const result = getErrorRateChart({ indexes: mockIndexes, filters: mockFilters });

      expect(result).toEqual({
        id: 'error_rate',
        title: 'Error Rate',
        color: chartPalette[6],
        unit: 'percent',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain(unmappedFieldsPrefix);
      expect(result?.esqlQuery).toContain('TO_STRING(event.outcome) == "failure"');
      expect(result?.esqlQuery).toContain('TO_STRING(status.code) == "Error"');
    });

    it('should include all provided filters in the ESQL query', () => {
      const result = getErrorRateChart({ indexes: mockIndexes, filters: mockFilters });

      expect(result?.esqlQuery).toContain('service.name == "test-service"');
      expect(result?.esqlQuery).toContain('environment == "production"');
      expect(result?.esqlQuery).toContain('TO_STRING(processor.event) == "transaction"');
    });

    it('should handle empty filters array', () => {
      const result = getErrorRateChart({ indexes: mockIndexes, filters: [] });

      expect(result?.esqlQuery).toContain('TO_STRING(processor.event) == "transaction"');
      expect(result?.esqlQuery).toContain('FROM traces-*');
    });

    it('should generate valid ESQL query structure', () => {
      const result = getErrorRateChart({ indexes: mockIndexes, filters: mockFilters });

      expect(result?.esqlQuery).toMatch(/FROM .+/);
      expect(result?.esqlQuery).toContain('STATS');
      expect(result?.esqlQuery).toContain('EVAL');
      expect(result?.esqlQuery).toContain('KEEP');
      expect(result?.esqlQuery).toContain('SORT');
      expect(result?.esqlQuery).toContain('BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
    });
  });

  describe('getLatencyChart', () => {
    it('should return latency chart configuration', () => {
      const result = getLatencyChart({ indexes: mockIndexes, filters: mockFilters });

      expect(result).toEqual({
        id: 'latency',
        title: 'Latency',
        color: chartPalette[2],
        unit: 'ms',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain(unmappedFieldsPrefix);
      expect(result?.esqlQuery).toContain(
        'duration_ms_ecs = ROUND(transaction.duration.us) / 1000'
      );
      expect(result?.esqlQuery).toContain('duration_ms_otel = ROUND(duration) / 1000 / 1000');
      expect(result?.esqlQuery).toContain(
        'duration_ms = COALESCE(TO_LONG(duration_ms_ecs), TO_LONG(duration_ms_otel))'
      );
    });

    it('should include all provided filters in the ESQL query', () => {
      const result = getLatencyChart({ indexes: mockIndexes, filters: mockFilters });

      expect(result?.esqlQuery).toContain('service.name == "test-service"');
      expect(result?.esqlQuery).toContain('environment == "production"');
      expect(result?.esqlQuery).toContain('TO_STRING(processor.event) == "transaction"');
    });

    it('should handle empty filters array', () => {
      const result = getLatencyChart({ indexes: mockIndexes, filters: [] });

      expect(result?.esqlQuery).toContain('FROM traces-*');
    });

    it('should generate valid ESQL query structure', () => {
      const result = getLatencyChart({ indexes: mockIndexes, filters: mockFilters });

      // Verify basic ESQL structure
      expect(result?.esqlQuery).toMatch(/FROM .+/);
      expect(result?.esqlQuery).toContain('EVAL');
      expect(result?.esqlQuery).toContain('STATS');
      expect(result?.esqlQuery).toContain('AVG(duration_ms)');
      expect(result?.esqlQuery).toContain('BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
    });
  });

  describe('getThroughputChart', () => {
    it('should return throughput chart configuration', () => {
      const result = getThroughputChart({ indexes: mockIndexes, filters: mockFilters });

      expect(result).toEqual({
        id: 'throughput',
        title: 'Throughput',
        color: chartPalette[0],
        unit: 'count',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain(unmappedFieldsPrefix);
      expect(result?.esqlQuery).toContain('id = COALESCE(transaction.id, span.id)');
      expect(result?.esqlQuery).toContain('COUNT(id)');
      expect(result?.esqlQuery).toContain('TO_STRING(processor.event) == "transaction"');
    });

    it('should include all provided filters in the ESQL query', () => {
      const result = getThroughputChart({ indexes: mockIndexes, filters: mockFilters });

      expect(result?.esqlQuery).toContain('service.name == "test-service"');
      expect(result?.esqlQuery).toContain('environment == "production"');
      expect(result?.esqlQuery).toContain('TO_STRING(processor.event) == "transaction"');
    });

    it('should handle empty filters array', () => {
      const result = getThroughputChart({ indexes: mockIndexes, filters: [] });

      expect(result?.esqlQuery).toContain('FROM traces-*');
    });

    it('should generate valid ESQL query structure', () => {
      const result = getThroughputChart({ indexes: mockIndexes, filters: mockFilters });

      // Verify basic ESQL structure
      expect(result?.esqlQuery).toMatch(/FROM .+/);
      expect(result?.esqlQuery).toContain('STATS');
    });
  });

  describe('when invalid filters are provided', () => {
    it('getErrorRateChart should return null', () => {
      const result = getErrorRateChart({
        indexes: mockIndexes,
        filters: mockInvalidFilters,
      });

      expect(result).toBeNull();
    });

    it('getLatencyChart should return null', () => {
      const result = getLatencyChart({
        indexes: mockIndexes,
        filters: mockInvalidFilters,
      });

      expect(result).toBeNull();
    });

    it('getThroughputChart should return null', () => {
      const result = getThroughputChart({
        indexes: mockIndexes,
        filters: mockInvalidFilters,
      });

      expect(result).toBeNull();
    });
  });
});
