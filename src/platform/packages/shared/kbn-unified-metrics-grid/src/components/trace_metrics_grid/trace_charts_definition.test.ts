/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getErrorRateChart, getLatencyChart, getThroughputChart } from './trace_charts_definition';
import { chartPalette, type DataSource } from '.';

describe('trace_charts_definition', () => {
  const mockIndexes = 'traces-*';
  const mockFilters = ['service.name == "test-service"', 'environment == "production"'];
  const mockInvalidFilters = ['service.name:test-service'];

  describe('getErrorRateChart', () => {
    it('should return error rate chart configuration for APM data source', () => {
      const dataSource: DataSource = 'apm';

      const result = getErrorRateChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      expect(result).toEqual({
        id: 'error_rate',
        title: 'Error Rate',
        color: chartPalette[6],
        unit: 'percent',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain('event.outcome == "failure"');
    });

    it('should return error rate chart configuration for OTEL data source', () => {
      const dataSource: DataSource = 'otel';

      const result = getErrorRateChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      expect(result).toEqual({
        id: 'error_rate',
        title: 'Error Rate',
        color: chartPalette[6],
        unit: 'percent',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain('status.code == "Error"');
      expect(result?.esqlQuery).not.toContain('event.outcome');
    });

    it('should include all provided filters in the ESQL query', () => {
      const dataSource: DataSource = 'apm';

      const result = getErrorRateChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      expect(result?.esqlQuery).toContain('service.name == "test-service"');
      expect(result?.esqlQuery).toContain('environment == "production"');
      expect(result?.esqlQuery).toContain('processor.event == "transaction"');
    });

    it('should handle empty filters array', () => {
      const dataSource: DataSource = 'apm';

      const result = getErrorRateChart({ dataSource, indexes: mockIndexes, filters: [] });

      expect(result?.esqlQuery).toContain('processor.event == "transaction"');
      expect(result?.esqlQuery).toContain('FROM traces-*');
    });

    it('should generate valid ESQL query structure', () => {
      const dataSource: DataSource = 'apm';

      const result = getErrorRateChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      expect(result?.esqlQuery).toMatch(/FROM .+/);
      expect(result?.esqlQuery).toContain('STATS');
      expect(result?.esqlQuery).toContain('EVAL');
      expect(result?.esqlQuery).toContain('KEEP');
      expect(result?.esqlQuery).toContain('SORT');
      expect(result?.esqlQuery).toContain('BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
    });
  });

  describe('getLatencyChart', () => {
    it('should return latency chart configuration for APM data source', () => {
      const dataSource: DataSource = 'apm';

      const result = getLatencyChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      expect(result).toEqual({
        id: 'latency',
        title: 'Latency',
        color: chartPalette[2],
        unit: 'ms',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain('ROUND(transaction.duration.us) / 1000');
    });

    it('should return latency chart configuration for OTEL data source', () => {
      const dataSource: DataSource = 'otel';

      const result = getLatencyChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      expect(result).toEqual({
        id: 'latency',
        title: 'Latency',
        color: chartPalette[2],
        unit: 'ms',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain('ROUND(duration) / 1000 / 1000');
    });

    it('should include all provided filters in the ESQL query', () => {
      const dataSource: DataSource = 'apm';

      const result = getLatencyChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      expect(result?.esqlQuery).toContain('service.name == "test-service"');
      expect(result?.esqlQuery).toContain('environment == "production"');
      expect(result?.esqlQuery).toContain('processor.event == "transaction"');
    });

    it('should handle empty filters array', () => {
      const dataSource: DataSource = 'otel';

      const result = getLatencyChart({ dataSource, indexes: mockIndexes, filters: [] });

      expect(result?.esqlQuery).toContain('FROM traces-*');
    });

    it('should generate valid ESQL query structure', () => {
      const dataSource: DataSource = 'apm';

      const result = getLatencyChart({ dataSource, indexes: mockIndexes, filters: mockFilters });

      // Verify basic ESQL structure
      expect(result?.esqlQuery).toMatch(/FROM .+/);
      expect(result?.esqlQuery).toContain('EVAL');
      expect(result?.esqlQuery).toContain('STATS');
      expect(result?.esqlQuery).toContain('AVG(duration_ms)');
      expect(result?.esqlQuery).toContain('BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
    });
  });

  describe('getThroughputChart', () => {
    it('should return throughput chart configuration for APM data source', () => {
      const dataSource: DataSource = 'apm';

      const result = getThroughputChart({
        dataSource,
        indexes: mockIndexes,
        filters: mockFilters,
        fieldName: 'transaction.id',
      });

      expect(result).toEqual({
        id: 'throughput',
        title: 'Throughput',
        color: chartPalette[0],
        unit: 'count',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain('COUNT(transaction.id)');
      expect(result?.esqlQuery).toContain('processor.event == "transaction"');
    });

    it('should return throughput chart configuration for OTEL data source', () => {
      const dataSource: DataSource = 'otel';

      const result = getThroughputChart({
        dataSource,
        indexes: mockIndexes,
        filters: mockFilters,
        fieldName: 'span.id',
      });

      expect(result).toEqual({
        id: 'throughput',
        title: 'Throughput',
        color: chartPalette[0],
        unit: 'count',
        seriesType: 'line',
        esqlQuery: expect.stringContaining('FROM traces-*'),
      });

      expect(result?.esqlQuery).toContain('COUNT(span.id)');
      expect(result?.esqlQuery).not.toContain('processor.event == "transaction"');
    });

    it('should include all provided filters in the ESQL query', () => {
      const dataSource: DataSource = 'apm';

      const result = getThroughputChart({
        dataSource,
        indexes: mockIndexes,
        filters: mockFilters,
        fieldName: 'transaction.id',
      });

      expect(result?.esqlQuery).toContain('service.name == "test-service"');
      expect(result?.esqlQuery).toContain('environment == "production"');
      expect(result?.esqlQuery).toContain('processor.event == "transaction"');
    });

    it('should handle empty filters array', () => {
      const dataSource: DataSource = 'otel';

      const result = getThroughputChart({
        dataSource,
        indexes: mockIndexes,
        filters: [],
        fieldName: 'transaction.id',
      });

      expect(result?.esqlQuery).toContain('FROM traces-*');
    });

    it('should generate valid ESQL query structure', () => {
      const dataSource: DataSource = 'apm';

      const result = getThroughputChart({
        dataSource,
        indexes: mockIndexes,
        filters: mockFilters,
        fieldName: 'transaction.id',
      });

      // Verify basic ESQL structure
      expect(result?.esqlQuery).toMatch(/FROM .+/);
      expect(result?.esqlQuery).toContain('STATS');
    });
  });

  describe('when invalid filters are provided', () => {
    it('getErrorRateChart should return null', () => {
      const dataSource: DataSource = 'apm';

      const result = getErrorRateChart({
        dataSource,
        indexes: mockIndexes,
        filters: mockInvalidFilters,
      });

      expect(result).toBeNull();
    });

    it('getLatencyChart should return null', () => {
      const dataSource: DataSource = 'apm';

      const result = getLatencyChart({
        dataSource,
        indexes: mockIndexes,
        filters: mockInvalidFilters,
      });

      expect(result).toBeNull();
    });

    it('getThroughputChart should return null', () => {
      const dataSource: DataSource = 'apm';

      const result = getThroughputChart({
        dataSource,
        indexes: mockIndexes,
        filters: mockInvalidFilters,
        fieldName: 'transaction.id',
      });

      expect(result).toBeNull();
    });
  });
});
