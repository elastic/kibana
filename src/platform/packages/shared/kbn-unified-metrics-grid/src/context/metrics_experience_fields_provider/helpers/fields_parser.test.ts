/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { MetricField } from '../../../types';
import { extractFields, createSampleRowByMetric } from './fields_parser';

describe('fields_parser', () => {
  describe('extractFields', () => {
    const baseParams = {
      index: 'metrics-*',
      dataViewFieldMap: {} as DataViewFieldMap,
      columns: [] as DatatableColumn[],
    };

    it('returns empty arrays when dataViewFieldMap is empty', () => {
      const result = extractFields(baseParams);

      expect(result.metricFields).toEqual([]);
      expect(result.dimensions).toEqual([]);
    });

    it('extracts metric fields with timeSeriesMetric attribute', () => {
      const dataViewFieldMap: DataViewFieldMap = {
        'system.cpu.utilization': {
          name: 'system.cpu.utilization',
          type: 'number',
          esTypes: ['double'],
          searchable: true,
          aggregatable: true,
          timeSeriesMetric: 'gauge',
        },
      };

      const columns: DatatableColumn[] = [
        {
          id: 'system.cpu.utilization',
          name: 'system.cpu.utilization',
          meta: { type: 'number', esType: 'double' },
        },
      ];

      const result = extractFields({ ...baseParams, dataViewFieldMap, columns });

      expect(result.metricFields).toHaveLength(1);
      expect(result.metricFields[0]).toEqual({
        index: 'metrics-*',
        name: 'system.cpu.utilization',
        type: 'double',
        instrument: 'gauge',
        dimensions: [],
      });
    });

    it('extracts dimensions with timeSeriesDimension attribute', () => {
      const dataViewFieldMap: DataViewFieldMap = {
        'host.name': {
          name: 'host.name',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
          timeSeriesDimension: true,
        },
      };

      const columns: DatatableColumn[] = [
        {
          id: 'host.name',
          name: 'host.name',
          meta: { type: 'string', esType: ES_FIELD_TYPES.KEYWORD },
        },
      ];

      const result = extractFields({ ...baseParams, dataViewFieldMap, columns });

      expect(result.dimensions).toHaveLength(1);
      expect(result.dimensions[0]).toEqual({
        name: 'host.name',
        type: ES_FIELD_TYPES.KEYWORD,
      });
    });

    it('extracts dimensions based on valid dimension types when timeSeriesDimension is null', () => {
      const dataViewFieldMap: DataViewFieldMap = {
        'service.name': {
          name: 'service.name',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
        },
      };

      const columns: DatatableColumn[] = [
        {
          id: 'service.name',
          name: 'service.name',
          meta: { type: 'string', esType: ES_FIELD_TYPES.KEYWORD },
        },
      ];

      const result = extractFields({ ...baseParams, dataViewFieldMap, columns });

      expect(result.dimensions).toHaveLength(1);
      expect(result.dimensions[0].name).toBe('service.name');
    });

    it('filters out internal fields', () => {
      const dataViewFieldMap: DataViewFieldMap = {
        _id: {
          name: '_id',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: false,
        },
        _metric_names_hash: {
          name: '_metric_names_hash',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: false,
        },
        'valid.field': {
          name: 'valid.field',
          type: 'number',
          esTypes: ['double'],
          searchable: true,
          aggregatable: true,
          timeSeriesMetric: 'gauge',
        },
      };

      const columns: DatatableColumn[] = [
        { id: 'valid.field', name: 'valid.field', meta: { type: 'number', esType: 'double' } },
      ];

      const result = extractFields({ ...baseParams, dataViewFieldMap, columns });

      expect(result.metricFields).toHaveLength(1);
      expect(result.metricFields[0].name).toBe('valid.field');
      expect(result.dimensions).toHaveLength(0);
    });
  });

  describe('createSampleRowByMetric', () => {
    const baseFieldSpecs: MetricField[] = [
      { name: 'system.cpu.utilization', index: 'metrics-*', type: 'double', dimensions: [] },
      { name: 'system.memory.utilization', index: 'metrics-*', type: 'double', dimensions: [] },
    ];

    it('returns empty maps when rows is empty', () => {
      const result = createSampleRowByMetric({ rows: [], fieldSpecs: baseFieldSpecs });

      expect(result.sampleRowByMetric.size).toBe(0);
    });

    it('returns empty maps when fieldSpecs is empty', () => {
      const rows: DatatableRow[] = [{ 'system.cpu.utilization': 0.5 }];
      const result = createSampleRowByMetric({ rows, fieldSpecs: [] });

      expect(result.sampleRowByMetric.size).toBe(0);
    });

    it('creates sample row mapping for each metric field', () => {
      const rows: DatatableRow[] = [
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-1' },
        { 'system.memory.utilization': 0.7, 'host.name': 'host-1' },
      ];

      const result = createSampleRowByMetric({ rows, fieldSpecs: baseFieldSpecs });

      expect(result.sampleRowByMetric.size).toBe(2);
      expect(result.sampleRowByMetric.get('system.cpu.utilization')).toEqual(rows[0]);
      expect(result.sampleRowByMetric.get('system.memory.utilization')).toEqual(rows[1]);
    });

    it('uses first row with value for each metric (does not overwrite)', () => {
      const rows: DatatableRow[] = [
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-1' },
        { 'system.cpu.utilization': 0.8, 'host.name': 'host-2' },
      ];

      const result = createSampleRowByMetric({ rows, fieldSpecs: baseFieldSpecs });

      // Should use first row, not second
      expect(result.sampleRowByMetric.get('system.cpu.utilization')).toEqual(rows[0]);
    });

    it('skips rows without values for metric fields', () => {
      const rows: DatatableRow[] = [
        { 'host.name': 'host-1' }, // No metric value
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-2' },
      ];

      const result = createSampleRowByMetric({ rows, fieldSpecs: baseFieldSpecs });

      expect(result.sampleRowByMetric.get('system.cpu.utilization')).toEqual(rows[1]);
    });

    it('handles null and undefined values correctly', () => {
      const rows: DatatableRow[] = [
        { 'system.cpu.utilization': null, 'host.name': 'host-1' },
        { 'system.cpu.utilization': undefined, 'host.name': 'host-2' },
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-3' },
      ];

      const result = createSampleRowByMetric({ rows, fieldSpecs: baseFieldSpecs });

      expect(result.sampleRowByMetric.get('system.cpu.utilization')).toEqual(rows[2]);
    });
  });
});
