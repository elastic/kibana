/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DateHistogramIndexPatternColumn } from '../datasources/operations';
import type { GenericIndexPatternColumn } from '../datasources/types';
import { generateEsqlQuery } from './generate_esql_query';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';
import {
  mockLayer,
  mockIndexPattern,
  mockIndexPatternWithoutTimeField,
  mockDateRange,
} from './__mocks__/esql_query_mocks';

const avgBytes = (label = 'Average of bytes'): GenericIndexPatternColumn =>
  ({
    operationType: 'average',
    sourceField: 'bytes',
    label,
    dataType: 'number',
    isBucketed: false,
  } as GenericIndexPatternColumn);

// Elasticsearch collapses repeated STATS expressions into a single result column, so the
// generator must emit each expression once and map every Lens column onto that one column.
describe('generateEsqlQuery duplicate columns', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  it('should emit a duplicated metric once and map both column ids to it', () => {
    const result = generateEsqlQuery(
      [
        ['1', avgBytes()],
        ['2', avgBytes()],
      ],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toBe('FROM myIndexPattern | STATS AVG(bytes)');
      expect(Object.keys(result.esAggsIdMap)).toEqual(['AVG(bytes)']);
      expect(result.esAggsIdMap['AVG(bytes)'].map(({ id }) => id)).toEqual(['1', '2']);
    }
  });

  it('should map every column id when the same metric is repeated more than twice', () => {
    const result = generateEsqlQuery(
      [
        ['1', avgBytes()],
        ['2', avgBytes()],
        ['3', avgBytes()],
      ],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toBe('FROM myIndexPattern | STATS AVG(bytes)');
      expect(result.esAggsIdMap['AVG(bytes)'].map(({ id }) => id)).toEqual(['1', '2', '3']);
    }
  });

  it('should preserve the individual custom label of each duplicated metric', () => {
    const result = generateEsqlQuery(
      [
        ['1', { ...avgBytes('Primary'), customLabel: true }],
        ['2', { ...avgBytes('Secondary'), customLabel: true }],
      ],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toBe('FROM myIndexPattern | STATS AVG(bytes)');
      expect(result.esAggsIdMap['AVG(bytes)'].map(({ id, label }) => ({ id, label }))).toEqual([
        { id: '1', label: 'Primary' },
        { id: '2', label: 'Secondary' },
      ]);
    }
  });

  it('should keep duplicated metrics separate when only one of them is filtered', () => {
    const result = generateEsqlQuery(
      [
        ['1', avgBytes()],
        [
          '2',
          {
            ...avgBytes(),
            filter: { query: 'bytes > 100', language: 'kuery' as const },
          } as GenericIndexPatternColumn,
        ],
      ],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toContain('STATS AVG(bytes), AVG(bytes) WHERE KQL');
      const idsByKey = Object.fromEntries(
        Object.entries(result.esAggsIdMap).map(([key, columns]) => [
          key.includes('KQL') ? 'filtered' : key,
          columns.map(({ id }) => id),
        ])
      );
      expect(idsByKey).toEqual({ 'AVG(bytes)': ['1'], filtered: ['2'] });
    }
  });

  it('should not merge an aliased metric with an identical bare metric', () => {
    const maxBytes = {
      operationType: 'max',
      sourceField: 'bytes',
      label: 'Maximum of bytes',
      dataType: 'number',
      isBucketed: false,
    } as GenericIndexPatternColumn;

    const result = generateEsqlQuery(
      [
        ['1', maxBytes],
        ['2', maxBytes],
      ],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date(),
      { '2': 'max_value' }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toBe('FROM myIndexPattern | STATS MAX(bytes), max_value = MAX(bytes)');
      expect(result.esAggsIdMap['MAX(bytes)'].map(({ id }) => id)).toEqual(['1']);
      expect(result.esAggsIdMap.max_value.map(({ id }) => id)).toEqual(['2']);
    }
  });

  it('should emit a duplicated metric once alongside a bucket', () => {
    const result = generateEsqlQuery(
      [
        [
          '1',
          {
            operationType: 'date_histogram',
            sourceField: 'order_date',
            label: 'Date histogram',
            dataType: 'date',
            isBucketed: true,
            params: { interval: 'auto' },
          } as DateHistogramIndexPatternColumn,
        ],
        ['2', avgBytes()],
        ['3', avgBytes()],
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toBe(
        'FROM myIndexPattern | WHERE order_date >= ?_tstart AND order_date <= ?_tend | STATS AVG(bytes) BY BUCKET(order_date, 75, ?_tstart, ?_tend)'
      );
      expect(result.esAggsIdMap['AVG(bytes)'].map(({ id }) => id)).toEqual(['2', '3']);
    }
  });

  it('should emit a duplicated bucket once and map both column ids to it', () => {
    const dateHistogram = {
      operationType: 'date_histogram',
      sourceField: 'order_date',
      label: 'Date histogram',
      dataType: 'date',
      isBucketed: true,
      params: { interval: 'auto' },
    } as DateHistogramIndexPatternColumn;

    const result = generateEsqlQuery(
      [
        ['1', dateHistogram],
        ['2', dateHistogram],
        ['3', avgBytes()],
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toBe(
        'FROM myIndexPattern | WHERE order_date >= ?_tstart AND order_date <= ?_tend | STATS AVG(bytes) BY BUCKET(order_date, 75, ?_tstart, ?_tend)'
      );
      expect(
        result.esAggsIdMap['BUCKET(order_date, 75, ?_tstart, ?_tend)'].map(({ id }) => id)
      ).toEqual(['1', '2']);
    }
  });
});
