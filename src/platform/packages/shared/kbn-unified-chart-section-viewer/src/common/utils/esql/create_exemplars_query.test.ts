/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ParsedMetricItem } from '../../../types';
import { createExemplarsQuery } from './create_exemplars_query';

const mockMetric: ParsedMetricItem = {
  // METRICS_INFO returns the `metrics.`-prefixed field name; the builder strips the prefix.
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
const TEST_EXEMPLARS_INDEX = 'exemplars-generic.otel-default';

describe('createExemplarsQuery', () => {
  it('builds the exemplars query for an OTel metric', () => {
    expect(
      createExemplarsQuery({ exemplarsIndex: TEST_EXEMPLARS_INDEX, metricItem: mockMetric })
    ).toBe(
      `
SET unmapped_fields = "NULLIFY";
FROM exemplars-generic.otel-default
  | WHERE metric_name == "http.server.request.duration"
  | SORT @timestamp DESC
  | LIMIT 500
`.trim()
    );
  });

  it('nullifies unmapped fields so an inherited WHERE on a metrics-only field cannot fail verification', () => {
    const query = createExemplarsQuery({
      exemplarsIndex: TEST_EXEMPLARS_INDEX,
      metricItem: mockMetric,
    });

    expect(query.startsWith('SET unmapped_fields = "NULLIFY";\n')).toBe(true);
  });

  it('appends each non-empty where statement as its own WHERE pipe before SORT', () => {
    expect(
      createExemplarsQuery({
        exemplarsIndex: TEST_EXEMPLARS_INDEX,
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
FROM exemplars-generic.otel-default
  | WHERE metric_name == "http.server.request.duration"
  | WHERE attributes.http.route == "/orders"
  | WHERE attributes.http.response.status_code >= 500
  | SORT @timestamp DESC
  | LIMIT 500
`.trim()
    );
  });

  it('honours an explicit maxRows override', () => {
    expect(
      createExemplarsQuery({
        exemplarsIndex: TEST_EXEMPLARS_INDEX,
        metricItem: { ...mockMetric, dimensionFields: [] },
        maxRows: 25,
      })
    ).toBe(
      `
SET unmapped_fields = "NULLIFY";
FROM exemplars-generic.otel-default
  | WHERE metric_name == "http.server.request.duration"
  | SORT @timestamp DESC
  | LIMIT 25
`.trim()
    );
  });

  it('escapes double quotes in the metric name string value', () => {
    expect(
      createExemplarsQuery({
        exemplarsIndex: TEST_EXEMPLARS_INDEX,
        metricItem: {
          ...mockMetric,
          metricName: 'metrics.odd"name',
          dimensionFields: [{ name: 'attributes.odd`dimension' }],
        },
      })
    ).toBe(
      `
SET unmapped_fields = "NULLIFY";
FROM exemplars-generic.otel-default
  | WHERE metric_name == "odd\\"name"
  | SORT @timestamp DESC
  | LIMIT 500
`.trim()
    );
  });

  it('escapes backslashes in the metric name string value', () => {
    expect(
      createExemplarsQuery({
        exemplarsIndex: TEST_EXEMPLARS_INDEX,
        metricItem: { ...mockMetric, metricName: 'metrics.odd\\name', dimensionFields: [] },
      })
    ).toContain('WHERE metric_name == "odd\\\\name"');
  });

  describe('returns an empty string so callers skip the fetch', () => {
    it('when the metric name is missing', () => {
      expect(
        createExemplarsQuery({
          exemplarsIndex: TEST_EXEMPLARS_INDEX,
          metricItem: { ...mockMetric, metricName: '' },
        })
      ).toBe('');
    });
  });

  it('never aggregates, so a grid breakdown cannot change which exemplars are fetched', () => {
    const query = createExemplarsQuery({
      exemplarsIndex: TEST_EXEMPLARS_INDEX,
      metricItem: mockMetric,
    });

    expect(query).not.toContain('STATS');
    expect(query).not.toContain(' BY ');
    expect(query).not.toContain('TBUCKET');
  });
});
