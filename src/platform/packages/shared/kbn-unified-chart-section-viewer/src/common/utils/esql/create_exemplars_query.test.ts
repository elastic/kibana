/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./create_esql_query', () => ({
  createESQLQuery: jest.fn(),
}));

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { METRICS_GRID_SETTINGS_DEFAULTS } from '@kbn/discover-utils';
import type { ParsedMetricItem } from '../../../types';
import { createESQLQuery } from './create_esql_query';
import { createExemplarsQuery } from './create_exemplars_query';

const mockCreateESQLQuery = createESQLQuery as jest.MockedFunction<typeof createESQLQuery>;

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

const CHART_QUERY = `
TS metrics-generic.otel-default
  | STATS PERCENTILE(metrics.http.server.request.duration, 95) BY TBUCKET(100)
`.trim();

const CHART_QUERY_WITH_NULLIFY = `
SET unmapped_fields = "NULLIFY";
${CHART_QUERY}
`.trim();

describe('createExemplarsQuery', () => {
  beforeEach(() => {
    mockCreateESQLQuery.mockReset();
    mockCreateESQLQuery.mockReturnValue(CHART_QUERY);
  });

  it('prefixes SET exemplars onto the chart time-series query', () => {
    expect(createExemplarsQuery({ metricItem: mockMetric })).toBe(
      `
SET exemplars = TRUE;
${CHART_QUERY}
`.trim()
    );
  });

  it('keeps a SET command already present on the chart query', () => {
    mockCreateESQLQuery.mockReturnValue(CHART_QUERY_WITH_NULLIFY);

    expect(createExemplarsQuery({ metricItem: mockMetric })).toBe(
      `
SET unmapped_fields = "NULLIFY";
SET exemplars = TRUE;
${CHART_QUERY}
`.trim()
    );
  });

  it('forwards the chart query params and never passes breakdown dimensions', () => {
    const whereStatements = ['attributes.http.route == "/orders"'];
    const metadataFields = ['_ignored'];
    const originalSource = 'remote:metrics-generic.otel-default';
    const gridSettings = METRICS_GRID_SETTINGS_DEFAULTS;

    createExemplarsQuery({
      metricItem: mockMetric,
      whereStatements,
      metadataFields,
      originalSource,
      gridSettings,
    });

    expect(mockCreateESQLQuery).toHaveBeenCalledWith({
      metricItem: mockMetric,
      splitAccessors: [],
      whereStatements,
      metadataFields,
      originalSource,
      gridSettings,
    });
  });

  it('returns an empty string when the chart query is empty', () => {
    mockCreateESQLQuery.mockReturnValue('');

    expect(createExemplarsQuery({ metricItem: mockMetric })).toBe('');
  });
});
