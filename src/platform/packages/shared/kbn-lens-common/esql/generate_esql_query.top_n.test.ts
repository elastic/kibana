/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IndexPattern } from '../types';
import type { DateHistogramIndexPatternColumn } from '../datasources/operations';
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

const createCountColumn = (): GenericIndexPatternColumn => ({
  label: 'Count of records',
  dataType: 'number',
  operationType: 'count',
  sourceField: 'records',
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

const buildTwoTermsMetricLayer = (
  outerTerms: ReturnType<typeof createTermsColumn>,
  innerTerms: ReturnType<typeof createTermsColumn>,
  metric: GenericIndexPatternColumn = createAverageColumn()
): FormBasedLayer => ({
  ...mockLayer,
  columns: {
    '1': outerTerms,
    '2': innerTerms,
    '3': metric,
  },
  columnOrder: ['1', '2', '3'],
  incompleteColumns: {},
  sampling: 1,
  indexPatternId: mockSampleLogsIndexPattern.id,
});

const createOuterGeoSrc = (
  params: Parameters<typeof createTermsColumn>[0] = {}
): ReturnType<typeof createTermsColumn> =>
  createTermsColumn(
    { orderBy: { type: 'alphabetical' }, orderDirection: 'asc', ...params },
    { sourceField: 'geo.src', label: 'Top values of geo.src' }
  );

describe('generateEsqlQuery top N', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  describe('single terms', () => {
    it('should convert eligible terms ordered alphabetically', () => {
      const terms = createTermsColumn();
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

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY host.keyword | SORT host.keyword ASC | LIMIT 5'
        );
      }
    });

    it('should convert eligible terms ordered by metric descending (Lens default)', () => {
      const terms = createTermsColumn({
        orderBy: { type: 'column', columnId: '2' },
        orderDirection: 'desc',
        size: 3,
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

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY host.keyword | SORT `AVG(bytes)` DESC | LIMIT 3'
        );
      }
    });

    it('should convert eligible terms ordered by metric ascending', () => {
      const terms = createTermsColumn({
        orderBy: { type: 'column', columnId: '2' },
        orderDirection: 'asc',
        size: 3,
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

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY host.keyword | SORT `AVG(bytes)` ASC | LIMIT 3'
        );
      }
    });

    it('should convert eligible terms ordered alphabetically descending', () => {
      const terms = createTermsColumn({
        orderBy: { type: 'alphabetical' },
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

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY host.keyword | SORT host.keyword DESC | LIMIT 5'
        );
      }
    });

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

    it('should convert count metric with SORT on COUNT(*)', () => {
      const terms = createTermsColumn({
        orderBy: { type: 'column', columnId: '2' },
        orderDirection: 'desc',
        size: 5,
      });
      const count = createCountColumn();
      const layer: FormBasedLayer = {
        ...mockLayer,
        columns: { '1': terms, '2': count },
        columnOrder: ['1', '2'],
        incompleteColumns: {},
        sampling: 1,
        indexPatternId: mockSampleLogsIndexPattern.id,
      };

      const result = generateEsqlQuery(
        [
          ['1', terms],
          ['2', count],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS COUNT(*) BY host.keyword | SORT `COUNT(*)` DESC | LIMIT 5'
        );
      }
    });
  });

  describe('multi terms', () => {
    it('should convert two terms dimensions with LIMIT BY outer group', () => {
      const outerTerms = createOuterGeoSrc({ size: 5 });
      const innerTerms = createTermsColumn({
        size: 3,
        orderBy: { type: 'column', columnId: '3' },
        orderDirection: 'desc',
      });
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', createAverageColumn()],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src, host.keyword | SORT `AVG(bytes)` DESC | LIMIT 3 BY geo.src'
        );
        expect(result.esql.indexOf('SORT')).toBeLessThan(result.esql.indexOf('LIMIT'));
      }
    });

    it('should convert two terms dimensions ordered alphabetically on the inner field', () => {
      const outerTerms = createOuterGeoSrc();
      const innerTerms = createTermsColumn({
        size: 4,
        orderBy: { type: 'alphabetical' },
        orderDirection: 'desc',
      });
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', createAverageColumn()],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src, host.keyword | SORT host.keyword DESC | LIMIT 4 BY geo.src'
        );
      }
    });

    it('should use only the inner Rank by when both dimensions order by metric (current behavior)', () => {
      const outerTerms = createOuterGeoSrc({
        size: 5,
        orderBy: { type: 'column', columnId: '3' },
        orderDirection: 'desc',
      });
      const innerTerms = createTermsColumn({
        size: 3,
        orderBy: { type: 'column', columnId: '3' },
        orderDirection: 'desc',
      });
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', createAverageColumn()],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src, host.keyword | SORT `AVG(bytes)` DESC | LIMIT 3 BY geo.src'
        );
      }
    });

    it('should use only the inner Rank by when outer is metric and inner is alphabetical', () => {
      const outerTerms = createOuterGeoSrc({
        orderBy: { type: 'column', columnId: '3' },
        orderDirection: 'desc',
      });
      const innerTerms = createTermsColumn({
        size: 4,
        orderBy: { type: 'alphabetical' },
        orderDirection: 'asc',
      });
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', createAverageColumn()],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src, host.keyword | SORT host.keyword ASC | LIMIT 4 BY geo.src'
        );
      }
    });

    it('should use the inner size for LIMIT BY and ignore the outer size (current behavior)', () => {
      const outerTerms = createOuterGeoSrc({ size: 5 });
      const innerTerms = createTermsColumn({
        size: 3,
        orderBy: { type: 'column', columnId: '3' },
        orderDirection: 'desc',
      });
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', createAverageColumn()],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toContain('LIMIT 3 BY geo.src');
        expect(result.esql).not.toContain('LIMIT 5');
      }
    });

    it('should quote dotted outer field names in LIMIT BY', () => {
      const outerTerms = createTermsColumn(
        {
          size: 5,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
        },
        { sourceField: 'agent.keyword', label: 'Top values of agent.keyword' }
      );
      const innerTerms = createTermsColumn(
        {
          size: 9,
          orderBy: { type: 'column', columnId: '3' },
          orderDirection: 'asc',
        },
        { sourceField: 'geo.dest', label: 'Top values of geo.dest' }
      );
      const count = createCountColumn();
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms, count);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', count],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toBe(
          'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS COUNT(*) BY agent.keyword, geo.dest | SORT `COUNT(*)` ASC | LIMIT 9 BY agent.keyword'
        );
      }
    });

    describe('outer and inner SORT', () => {
      // Desired: second SORT after LIMIT BY so outer Rank by is honored for presentation.
      // Current converter emits only the inner SORT before LIMIT BY.

      it.failing(
        'should emit a second SORT by metric when both dimensions use Lens default metric DESC',
        () => {
          const outerTerms = createOuterGeoSrc({
            size: 5,
            orderBy: { type: 'column', columnId: '3' },
            orderDirection: 'desc',
          });
          const innerTerms = createTermsColumn({
            size: 3,
            orderBy: { type: 'column', columnId: '3' },
            orderDirection: 'desc',
          });
          const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

          const result = generateEsqlQuery(
            [
              ['1', outerTerms],
              ['2', innerTerms],
              ['3', createAverageColumn()],
            ],
            layer,
            mockSampleLogsIndexPattern,
            uiSettings,
            mockDateRange,
            new Date()
          );

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src, host.keyword | SORT `AVG(bytes)` DESC | LIMIT 3 BY geo.src | SORT `AVG(bytes)` DESC'
            );
          }
        }
      );

      it.failing(
        'should emit a second SORT for outer alphabetical after inner metric top-N',
        () => {
          const outerTerms = createOuterGeoSrc({
            size: 5,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'asc',
          });
          const innerTerms = createTermsColumn({
            size: 3,
            orderBy: { type: 'column', columnId: '3' },
            orderDirection: 'desc',
          });
          const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

          const result = generateEsqlQuery(
            [
              ['1', outerTerms],
              ['2', innerTerms],
              ['3', createAverageColumn()],
            ],
            layer,
            mockSampleLogsIndexPattern,
            uiSettings,
            mockDateRange,
            new Date()
          );

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src, host.keyword | SORT `AVG(bytes)` DESC | LIMIT 3 BY geo.src | SORT geo.src ASC, `AVG(bytes)` DESC'
            );
          }
        }
      );

      it.failing('should emit a second SORT when both dimensions are alphabetical', () => {
        const outerTerms = createOuterGeoSrc({
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
        });
        const innerTerms = createTermsColumn({
          size: 4,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'desc',
        });
        const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

        const result = generateEsqlQuery(
          [
            ['1', outerTerms],
            ['2', innerTerms],
            ['3', createAverageColumn()],
          ],
          layer,
          mockSampleLogsIndexPattern,
          uiSettings,
          mockDateRange,
          new Date()
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.esql).toBe(
            'FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src, host.keyword | SORT host.keyword DESC | LIMIT 4 BY geo.src | SORT geo.src ASC, host.keyword DESC'
          );
        }
      });
    });
  });

  describe('failures', () => {
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

    it('should return terms_order_by_not_supported when inner orderBy column is missing', () => {
      const outerTerms = createOuterGeoSrc();
      const innerTerms = createTermsColumn({
        size: 3,
        orderBy: { type: 'column', columnId: 'missing-metric' },
        orderDirection: 'desc',
      });
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', createAverageColumn()],
        ],
        layer,
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

    it('should return terms_other_bucket_not_supported when other bucket is enabled', () => {
      const terms = createTermsColumn({ otherBucket: true });
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
        reason: 'terms_other_bucket_not_supported',
      });
    });

    it('should return terms_other_bucket_not_supported when inner other bucket is enabled', () => {
      const outerTerms = createOuterGeoSrc({ otherBucket: false });
      const innerTerms = createTermsColumn({
        otherBucket: true,
        orderBy: { type: 'column', columnId: '3' },
        orderDirection: 'desc',
      });
      const layer = buildTwoTermsMetricLayer(outerTerms, innerTerms);

      const result = generateEsqlQuery(
        [
          ['1', outerTerms],
          ['2', innerTerms],
          ['3', createAverageColumn()],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result).toEqual({
        success: false,
        reason: 'terms_other_bucket_not_supported',
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

    it('should return terms_not_supported when terms is combined with a date histogram', () => {
      const terms = createTermsColumn();
      const dateHistogram: DateHistogramIndexPatternColumn = {
        label: 'timestamp',
        dataType: 'date',
        operationType: 'date_histogram',
        sourceField: 'timestamp',
        isBucketed: true,
        params: { interval: 'auto' },
      };
      const layer: FormBasedLayer = {
        ...buildTermsAverageLayer(terms),
        columns: {
          '1': dateHistogram,
          '2': terms,
          '3': createAverageColumn(),
        },
        columnOrder: ['1', '2', '3'],
      };

      const result = generateEsqlQuery(
        [
          ['1', dateHistogram],
          ['2', terms],
          ['3', createAverageColumn()],
        ],
        layer,
        mockSampleLogsIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result).toEqual({
        success: false,
        reason: 'terms_not_supported',
      });
    });
  });
});
