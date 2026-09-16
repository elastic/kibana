/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IndexPattern } from '../types';
import type { FormBasedLayer, GenericIndexPatternColumn } from '../datasources/types';

import { generateEsqlQuery } from './generate_esql_query';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';
import { createTermsColumn, mockDateRange, mockLayer } from './__mocks__/esql_query_mocks';

const createAverageColumn = (): GenericIndexPatternColumn => ({
  label: 'Average of bytes',
  dataType: 'number',
  operationType: 'average',
  sourceField: 'bytes',
  isBucketed: false,
});

const mockSampleLogsIndexPattern = {
  title: 'kibana_sample_data_logs',
  timeFieldName: 'timestamp',
  getFieldByName: (field: string) => {
    if (field === 'records') return undefined;
    return { name: field };
  },
  getFormatterForField: () => ({ convertToText: (v: unknown) => v }),
} as unknown as IndexPattern;

const buildTermsAverageLayer = (terms: ReturnType<typeof createTermsColumn>): FormBasedLayer => ({
  ...mockLayer,
  columns: {
    '1': terms,
    '2': createAverageColumn(),
  },
  columnOrder: ['1', '2'],
  incompleteColumns: {},
  sampling: 1,
  indexPatternId: mockSampleLogsIndexPattern.id,
});

describe('generateEsqlQuery top N', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  // NOTE: eligible-terms happy paths (alphabetical and metric ordering),
  // the multi-bucket guard, and the other-bucket failure are covered by the
  // shared case matrix in esql_conversion_cases.test.ts (@kbn/lens-test-helpers).

  it('should sort by metric alias when columnRoles are provided', () => {
    const terms = createTermsColumn({
      orderBy: { type: 'column', columnId: '2' },
      orderDirection: 'desc',
    });
    const result = generateEsqlQuery(
      [
        ['1', terms],
        ['2', createAverageColumn()],
      ],
      buildTermsAverageLayer(terms),
      mockSampleLogsIndexPattern,
      uiSettings,
      mockDateRange,
      new Date(),
      { '2': 'avg_bytes' }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toBe(
        'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS avg_bytes = AVG(bytes) BY host.keyword | SORT avg_bytes DESC | LIMIT 5'
      );
    }
  });

  it('should return terms_order_by_not_supported when orderBy column is missing', () => {
    const terms = createTermsColumn({
      orderBy: { type: 'column', columnId: 'missing-metric' },
      orderDirection: 'desc',
    });
    const result = generateEsqlQuery(
      [
        ['1', terms],
        ['2', createAverageColumn()],
      ],
      buildTermsAverageLayer(terms),
      mockSampleLogsIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual({
      success: false,
      reason: 'terms_order_by_not_supported',
    });
  });

  it('should return terms_order_by_not_supported for rare ranking', () => {
    const terms = createTermsColumn({ orderBy: { type: 'rare', maxDocCount: 3 } });
    const result = generateEsqlQuery(
      [
        ['1', terms],
        ['2', createAverageColumn()],
      ],
      buildTermsAverageLayer(terms),
      mockSampleLogsIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual({
      success: false,
      reason: 'terms_order_by_not_supported',
    });
  });
});
