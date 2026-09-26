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

describe('createExemplarsQuery', () => {
  it('builds the exemplars query for an OTel metric', () => {
    expect(createExemplarsQuery({ metricItem: mockMetric })).toBe(
      `
SET unmapped_fields = "NULLIFY";
FROM exemplars-generic.otel-default
  | WHERE metric_name == "http.server.request.duration"
  | KEEP @timestamp, metric_name, value, trace.id, span.id, \`attributes.http.route\`, \`resource.attributes.service.name\`
  | SORT @timestamp DESC
  | LIMIT 500
`.trim()
    );
  });

  it('nullifies unmapped fields so a dimension absent from the exemplars stream cannot fail KEEP', () => {
    const query = createExemplarsQuery({ metricItem: mockMetric });

    expect(query.startsWith('SET unmapped_fields = "NULLIFY";\n')).toBe(true);
  });

  it('appends each non-empty where statement as its own WHERE pipe before KEEP', () => {
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
FROM exemplars-generic.otel-default
  | WHERE metric_name == "http.server.request.duration"
  | WHERE attributes.http.route == "/orders"
  | WHERE attributes.http.response.status_code >= 500
  | KEEP @timestamp, metric_name, value, trace.id, span.id, \`attributes.http.route\`, \`resource.attributes.service.name\`
  | SORT @timestamp DESC
  | LIMIT 500
`.trim()
    );
  });

  it('keeps only the trace correlation columns when the metric declares no dimensions', () => {
    expect(createExemplarsQuery({ metricItem: { ...mockMetric, dimensionFields: [] } })).toBe(
      `
SET unmapped_fields = "NULLIFY";
FROM exemplars-generic.otel-default
  | WHERE metric_name == "http.server.request.duration"
  | KEEP @timestamp, metric_name, value, trace.id, span.id
  | SORT @timestamp DESC
  | LIMIT 500
`.trim()
    );
  });

  it('honours an explicit maxRows override', () => {
    expect(
      createExemplarsQuery({
        metricItem: { ...mockMetric, dimensionFields: [] },
        maxRows: 25,
      })
    ).toBe(
      `
SET unmapped_fields = "NULLIFY";
FROM exemplars-generic.otel-default
  | WHERE metric_name == "http.server.request.duration"
  | KEEP @timestamp, metric_name, value, trace.id, span.id
  | SORT @timestamp DESC
  | LIMIT 25
`.trim()
    );
  });

  it('escapes double quotes in the metric name string value', () => {
    expect(
      createExemplarsQuery({
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
  | KEEP @timestamp, metric_name, value, trace.id, span.id, \`attributes.odd\`\`dimension\`
  | SORT @timestamp DESC
  | LIMIT 500
`.trim()
    );
  });

  it('escapes backslashes in the metric name string value', () => {
    expect(
      createExemplarsQuery({
        metricItem: { ...mockMetric, metricName: 'metrics.odd\\name', dimensionFields: [] },
      })
    ).toContain('WHERE metric_name == "odd\\\\name"');
  });

  it('does not repeat a dimension that collides with a shared exemplar column', () => {
    const query = createExemplarsQuery({
      metricItem: {
        ...mockMetric,
        dimensionFields: [{ name: 'trace.id' }, { name: 'attributes.http.route' }],
      },
    });

    expect(query).toContain(
      'KEEP @timestamp, metric_name, value, trace.id, span.id, `attributes.http.route`'
    );
  });

  describe('index resolution', () => {
    it('prefers originalSource when the user typed a single concrete index', () => {
      expect(
        createExemplarsQuery({
          metricItem: { ...mockMetric, dimensionFields: [] },
          originalSource: 'metrics-generic.otel-production',
        })
      ).toContain('FROM exemplars-generic.otel-production');
    });

    it('falls back to indexName when originalSource is a pattern', () => {
      expect(
        createExemplarsQuery({
          metricItem: { ...mockMetric, dimensionFields: [] },
          originalSource: 'metrics-*',
        })
      ).toContain('FROM exemplars-generic.otel-default');
    });
  });

  describe('returns an empty string so callers skip the fetch', () => {
    it('when the metrics index is not an OTel data stream', () => {
      expect(
        createExemplarsQuery({
          metricItem: { ...mockMetric, indexName: 'metrics-system.cpu-default' },
        })
      ).toBe('');
    });

    it('when the metrics index is a wildcard pattern', () => {
      expect(createExemplarsQuery({ metricItem: { ...mockMetric, indexName: 'metrics-*' } })).toBe(
        ''
      );
    });

    it('when the metric name is missing', () => {
      expect(createExemplarsQuery({ metricItem: { ...mockMetric, metricName: '' } })).toBe('');
    });
  });

  it('never aggregates, so a grid breakdown cannot change which exemplars are fetched', () => {
    const query = createExemplarsQuery({ metricItem: mockMetric });

    expect(query).not.toContain('STATS');
    expect(query).not.toContain(' BY ');
    expect(query).not.toContain('TBUCKET');
  });
});
