/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { METRICS_GRID_SETTINGS_DEFAULTS } from '@kbn/discover-utils';
import type { ParsedMetricItem } from '../../../types';
import { createExemplarsQuery } from './create_exemplars_query';

const mockMetric: ParsedMetricItem = {
  metricName: 'metrics.http.server.request.duration',
  indexName: 'metrics-generic.otel-default',
  units: ['ms'],
  metricTypes: ['histogram'],
  fieldTypes: [ES_FIELD_TYPES.TDIGEST],
  dimensionFields: [
    { name: 'attributes.http.route' },
    { name: 'resource.attributes.service.name' },
  ],
};

const STATS_CLAUSE = 'STATS PERCENTILE(metrics.http.server.request.duration, 95) BY TBUCKET(100)';

describe('createExemplarsQuery', () => {
  it('prefixes SET exemplars onto the chart time-series query', () => {
    expect(createExemplarsQuery({ metricItem: mockMetric })).toBe(
      `
SET exemplars = TRUE;
TS metrics-generic.otel-default
  | ${STATS_CLAUSE}
`.trim()
    );
  });

  it('keeps inherited WHERE clauses and nullifies unmapped fields when they name a user column', () => {
    expect(
      createExemplarsQuery({
        metricItem: mockMetric,
        whereStatements: [
          ' attributes.http.route == "/orders" ',
          '',
          'attributes.http.response.status_code >= 500',
          '  \n\t  ',
        ],
      })
    ).toBe(
      `
SET unmapped_fields = "NULLIFY";
SET exemplars = TRUE;
TS metrics-generic.otel-default
  | WHERE attributes.http.route == "/orders"
  | WHERE attributes.http.response.status_code >= 500
  | ${STATS_CLAUSE}
`.trim()
    );
  });

  it('declares metadata fields the WHERE statements use', () => {
    expect(
      createExemplarsQuery({
        metricItem: mockMetric,
        whereStatements: ['_ignored IS NULL'],
        metadataFields: ['_ignored'],
      })
    ).toBe(
      `
SET unmapped_fields = "NULLIFY";
SET exemplars = TRUE;
TS metrics-generic.otel-default METADATA _ignored
  | WHERE _ignored IS NULL
  | ${STATS_CLAUSE}
`.trim()
    );
  });

  it('queries a Prometheus remote-write source the same way as an OTel source', () => {
    const prometheusMetric: ParsedMetricItem = {
      ...mockMetric,
      metricName: 'metrics.http_requests_total',
      indexName: 'metrics-prometheus.remote_write-default',
      metricTypes: ['counter'],
      fieldTypes: [ES_FIELD_TYPES.LONG],
      dimensionFields: [],
    };

    expect(createExemplarsQuery({ metricItem: prometheusMetric })).toBe(
      `
SET exemplars = TRUE;
TS metrics-prometheus.remote_write-default
  | STATS SUM(RATE(metrics.http_requests_total)) BY TBUCKET(100)
`.trim()
    );
  });

  it('uses a concrete user source, including a remote cluster prefix', () => {
    expect(
      createExemplarsQuery({
        metricItem: mockMetric,
        originalSource: 'remote:metrics-generic.otel-default',
      })
    ).toBe(
      `
SET exemplars = TRUE;
TS remote:metrics-generic.otel-default
  | ${STATS_CLAUSE}
`.trim()
    );
  });

  it('follows the cluster-qualified metric index when the typed source is a remote or wildcard-cluster pattern', () => {
    const cases = [
      {
        originalSource: 'remote:metrics-*',
        indexName: 'remote:metrics-generic.otel-default',
      },
      {
        originalSource: '*:metrics-*',
        indexName: 'other:metrics-generic.otel-default',
      },
    ];

    for (const { originalSource, indexName } of cases) {
      expect(
        createExemplarsQuery({
          metricItem: { ...mockMetric, indexName },
          originalSource,
        })
      ).toBe(
        `
SET exemplars = TRUE;
TS ${indexName}
  | ${STATS_CLAUSE}
`.trim()
      );
    }
  });

  it('applies the grid aggregation settings', () => {
    expect(
      createExemplarsQuery({
        metricItem: mockMetric,
        gridSettings: { ...METRICS_GRID_SETTINGS_DEFAULTS, histogramPercentile: 'p50' },
      })
    ).toContain('PERCENTILE(metrics.http.server.request.duration, 50)');
  });

  it('aggregates by the time bucket only, so a grid breakdown cannot change the fetch', () => {
    const query = createExemplarsQuery({ metricItem: mockMetric });

    expect(query).toContain('BY TBUCKET(100)');
    expect(query).not.toContain('attributes.http.route');
    expect(query).not.toContain('resource.attributes.service.name');
  });

  describe('returns an empty string so callers skip the fetch', () => {
    it('when the metric has no field type', () => {
      expect(
        createExemplarsQuery({
          metricItem: { ...mockMetric, fieldTypes: [] },
        })
      ).toBe('');
    });

    it('when the metric has no instrument', () => {
      expect(
        createExemplarsQuery({
          metricItem: { ...mockMetric, metricTypes: [] },
        })
      ).toBe('');
    });

    it('when the metric field type is unsigned_long', () => {
      expect(
        createExemplarsQuery({
          metricItem: {
            ...mockMetric,
            metricTypes: ['counter'],
            fieldTypes: [ES_FIELD_TYPES.UNSIGNED_LONG],
          },
        })
      ).toBe('');
    });
  });
});
