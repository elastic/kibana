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
import { categorizeFields, createSampleRowByField } from './fields_parser';

describe('fields_parser', () => {
  describe('categorizeFields', () => {
    const baseParams = {
      index: 'metrics-*',
      dataViewFieldMap: {} as DataViewFieldMap,
      columns: [] as DatatableColumn[],
    };

    it('returns empty arrays when dataViewFieldMap is empty', () => {
      const result = categorizeFields(baseParams);

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

      const result = categorizeFields({ ...baseParams, dataViewFieldMap, columns });

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

      const result = categorizeFields({ ...baseParams, dataViewFieldMap, columns });

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

      const result = categorizeFields({ ...baseParams, dataViewFieldMap, columns });

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

      const result = categorizeFields({ ...baseParams, dataViewFieldMap, columns });

      expect(result.metricFields).toHaveLength(1);
      expect(result.metricFields[0].name).toBe('valid.field');
      expect(result.dimensions).toHaveLength(0);
    });

    describe('sorting', () => {
      it('sorts metric fields alphabetically by name (case-insensitive)', () => {
        const dataViewFieldMap: DataViewFieldMap = {
          'zebra.metric': {
            name: 'zebra.metric',
            type: 'number',
            esTypes: ['double'],
            searchable: true,
            aggregatable: true,
            timeSeriesMetric: 'gauge',
          },
          'Alpha.metric': {
            name: 'Alpha.metric',
            type: 'number',
            esTypes: ['double'],
            searchable: true,
            aggregatable: true,
            timeSeriesMetric: 'gauge',
          },
          'middle.metric': {
            name: 'middle.metric',
            type: 'number',
            esTypes: ['long'],
            searchable: true,
            aggregatable: true,
            timeSeriesMetric: 'counter',
          },
        };

        const columns: DatatableColumn[] = [
          { id: 'zebra.metric', name: 'zebra.metric', meta: { type: 'number', esType: 'double' } },
          { id: 'Alpha.metric', name: 'Alpha.metric', meta: { type: 'number', esType: 'double' } },
          { id: 'middle.metric', name: 'middle.metric', meta: { type: 'number', esType: 'long' } },
        ];

        const result = categorizeFields({ ...baseParams, dataViewFieldMap, columns });

        expect(result.metricFields.map((f) => f.name)).toEqual([
          'Alpha.metric',
          'middle.metric',
          'zebra.metric',
        ]);
      });

      it('sorts dimensions alphabetically by name (case-insensitive)', () => {
        const dataViewFieldMap: DataViewFieldMap = {
          'Zebra.dimension': {
            name: 'Zebra.dimension',
            type: 'string',
            esTypes: [ES_FIELD_TYPES.KEYWORD],
            searchable: true,
            aggregatable: true,
            timeSeriesDimension: true,
          },
          'alpha.dimension': {
            name: 'alpha.dimension',
            type: 'string',
            esTypes: [ES_FIELD_TYPES.KEYWORD],
            searchable: true,
            aggregatable: true,
            timeSeriesDimension: true,
          },
          'Middle.dimension': {
            name: 'Middle.dimension',
            type: 'string',
            esTypes: [ES_FIELD_TYPES.KEYWORD],
            searchable: true,
            aggregatable: true,
            timeSeriesDimension: true,
          },
        };

        const columns: DatatableColumn[] = [
          {
            id: 'Zebra.dimension',
            name: 'Zebra.dimension',
            meta: { type: 'string', esType: ES_FIELD_TYPES.KEYWORD },
          },
          {
            id: 'alpha.dimension',
            name: 'alpha.dimension',
            meta: { type: 'string', esType: ES_FIELD_TYPES.KEYWORD },
          },
          {
            id: 'Middle.dimension',
            name: 'Middle.dimension',
            meta: { type: 'string', esType: ES_FIELD_TYPES.KEYWORD },
          },
        ];

        const result = categorizeFields({ ...baseParams, dataViewFieldMap, columns });

        expect(result.dimensions.map((d) => d.name)).toEqual([
          'alpha.dimension',
          'Middle.dimension',
          'Zebra.dimension',
        ]);
      });
    });
  });

  describe('createSampleRowByField', () => {
    const fieldNames = ['system.cpu.utilization', 'system.memory.utilization'];

    it('returns empty map when rows is empty', () => {
      const result = createSampleRowByField({ rows: [], fieldNames });

      expect(result.size).toBe(0);
    });

    it('returns empty map when fieldNames is empty', () => {
      const rows: DatatableRow[] = [{ 'system.cpu.utilization': 0.5 }];
      const result = createSampleRowByField({ rows, fieldNames: [] });

      expect(result.size).toBe(0);
    });

    it('creates sample row index mapping for each field', () => {
      const rows: DatatableRow[] = [
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-1' },
        { 'system.memory.utilization': 0.7, 'host.name': 'host-1' },
      ];

      const result = createSampleRowByField({ rows, fieldNames });

      expect(result.size).toBe(2);
      expect(result.get('system.cpu.utilization')).toBe(0); // index 0
      expect(result.get('system.memory.utilization')).toBe(1); // index 1
    });

    it('uses first row with value for each field (does not overwrite)', () => {
      const rows: DatatableRow[] = [
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-1' },
        { 'system.cpu.utilization': 0.8, 'host.name': 'host-2' },
      ];

      const result = createSampleRowByField({ rows, fieldNames });

      // Should use first row index, not second
      expect(result.get('system.cpu.utilization')).toBe(0);
    });

    it('skips rows without values for fields', () => {
      const rows: DatatableRow[] = [
        { 'host.name': 'host-1' }, // No metric value
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-2' },
      ];

      const result = createSampleRowByField({ rows, fieldNames });

      expect(result.get('system.cpu.utilization')).toBe(1); // index 1
    });

    it('handles null and undefined values correctly', () => {
      const rows: DatatableRow[] = [
        { 'system.cpu.utilization': null, 'host.name': 'host-1' },
        { 'system.cpu.utilization': undefined, 'host.name': 'host-2' },
        { 'system.cpu.utilization': 0.5, 'host.name': 'host-3' },
      ];

      const result = createSampleRowByField({ rows, fieldNames });

      expect(result.get('system.cpu.utilization')).toBe(2); // index 2
    });

    it('stops early when all fields are found', () => {
      const rows: DatatableRow[] = [
        { 'system.cpu.utilization': 0.5, 'system.memory.utilization': 0.7 },
        { 'system.cpu.utilization': 0.8, 'system.memory.utilization': 0.9 },
        { 'system.cpu.utilization': 0.3, 'system.memory.utilization': 0.4 },
      ];

      const result = createSampleRowByField({ rows, fieldNames });

      // Both found in first row
      expect(result.size).toBe(2);
      expect(result.get('system.cpu.utilization')).toBe(0);
      expect(result.get('system.memory.utilization')).toBe(0);
    });
  });
});
