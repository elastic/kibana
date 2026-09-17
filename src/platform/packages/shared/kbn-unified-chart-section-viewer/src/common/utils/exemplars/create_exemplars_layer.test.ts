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
import { createExemplarsLayer } from './create_exemplars_layer';

const mockMetric: ParsedMetricItem = {
  metricName: 'metrics.http.server.request.duration',
  indexName: 'metrics-generic.otel-default',
  units: ['ms'],
  metricTypes: ['histogram'],
  fieldTypes: [ES_FIELD_TYPES.TDIGEST],
  dimensionFields: [{ name: 'attributes.http.route' }],
};

describe('createExemplarsLayer', () => {
  it('returns a points layer keyed on the raw metric name when the metric has exemplars', () => {
    const layer = createExemplarsLayer({
      metricItem: mockMetric,
      availableMetrics: new Set([mockMetric.metricName]),
    });

    expect(layer).toEqual({
      type: 'points',
      yAccessor: 'metrics.http.server.request.duration',
      query: `
FROM exemplars-generic.otel-default
  | WHERE \`metrics.http.server.request.duration\` IS NOT NULL
  | KEEP @timestamp, \`metrics.http.server.request.duration\`, trace_id, span_id, \`attributes.http.route\`
  | SORT @timestamp DESC
  | LIMIT 500
`.trim(),
    });
  });

  it('forwards where statements and the original source into the layer query', () => {
    const layer = createExemplarsLayer({
      metricItem: mockMetric,
      availableMetrics: new Set([mockMetric.metricName]),
      whereStatements: ['attributes.http.route == "/orders"'],
      originalSource: 'metrics-custom.otel-prod',
    });

    expect(layer?.query).toContain('FROM exemplars-custom.otel-prod');
    expect(layer?.query).toContain('| WHERE attributes.http.route == "/orders"');
  });

  it('returns undefined when the probe did not find the metric in the exemplars stream', () => {
    expect(
      createExemplarsLayer({ metricItem: mockMetric, availableMetrics: new Set<string>() })
    ).toBeUndefined();
  });

  it('returns undefined when no exemplars index can be derived for the metric', () => {
    expect(
      createExemplarsLayer({
        metricItem: { ...mockMetric, indexName: 'metrics-system.cpu-default' },
        availableMetrics: new Set([mockMetric.metricName]),
      })
    ).toBeUndefined();
  });
});
