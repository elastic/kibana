/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DiscoverSessionApiData,
  DiscoverSessionApiDataInput,
} from '@kbn/as-code-discover-schema';
import type { DiscoverSessionApiResponse, DiscoverSessionSearchResponse } from './schema';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../common/constants';

const classicSession = {
  title: 'Sample web logs',
  tabs: [
    {
      id: 'logs',
      label: 'Logs',
      data_source: {
        type: 'data_view_spec',
        index_pattern: 'kibana_sample_data_logs',
        time_field: 'timestamp',
      },
      query: { language: 'kql', expression: 'response: 200' },
      column_order: ['timestamp', 'response', 'url'],
    },
  ],
} satisfies DiscoverSessionApiDataInput;

const classicReferenceSession = {
  ...classicSession,
  tabs: classicSession.tabs.map((tab) => ({
    ...tab,
    data_source: {
      type: 'data_view_reference',
      ref_id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
  })),
} satisfies DiscoverSessionApiDataInput;

const esqlSession = {
  title: 'Requests by extension',
  description: '',
  tags: [],
  tabs: [
    {
      id: 'requests',
      label: 'Requests',
      type: 'default',
      data_source: {
        type: 'esql',
        query:
          'FROM kibana_sample_data_logs | STATS requests = COUNT(*) BY extension | SORT requests DESC',
      },
      column_order: ['extension', 'requests'],
      sort: [],
      hide_chart: false,
      hide_table: false,
    },
  ],
} satisfies DiscoverSessionApiData;

const metricsSession = {
  title: 'Sample web logs metrics',
  tabs: [
    {
      id: 'metrics',
      label: 'Metrics',
      type: 'metrics',
      data_source: { type: 'esql', query: 'TS kibana_sample_data_logstsdb' },
      dimensions: ['event.dataset'],
      search_term: 'bytes',
      counter_aggregation: 'max',
      gauge_aggregation: 'avg',
      histogram_percentile: 'p95',
      grid_sort_field: 'alphabetically',
      grid_sort_direction: 'asc',
    },
  ],
} satisfies DiscoverSessionApiDataInput;

const sessionResponse = {
  id: 'web-log-requests',
  data: esqlSession,
  meta: {
    created_at: '2026-10-15T09:00:00.000Z',
    created_by: 'u_example',
    updated_at: '2026-10-15T09:00:00.000Z',
    updated_by: 'u_example',
    managed: false,
    version: 'WzEsMV0=',
  },
} satisfies DiscoverSessionApiResponse;

const searchResponse = {
  data: [
    {
      id: sessionResponse.id,
      data: {
        title: esqlSession.title,
        description: esqlSession.description,
        tags: esqlSession.tags,
      },
      meta: sessionResponse.meta,
    },
  ],
  meta: { page: 1, per_page: 20, total: 1 },
} satisfies DiscoverSessionSearchResponse;

const sessionResponseExample = jsonExamples({
  esql: { summary: 'Response for the ES|QL session example', value: sessionResponse },
});

export const createDiscoverSessionOASOperationObject = {
  'x-codeSamples': codeSamples({ method: 'POST', body: esqlSession }),
  requestBody: {
    content: {
      'application/json': {
        examples: {
          classic: { summary: 'Classic tab with an inline data view', value: classicSession },
          classic_reference: {
            summary: 'Classic tab with the existing sample web logs data view',
            value: classicReferenceSession,
          },
          esql: { summary: 'ES|QL tab with requests by extension', value: esqlSession },
          metrics: { summary: 'Metrics tab using sample time series logs', value: metricsSession },
        },
      },
    },
  },
  responses: { 201: sessionResponseExample },
};

export const upsertDiscoverSessionOASOperationObject = {
  'x-codeSamples': codeSamples({
    method: 'PUT',
    suffix: `/${sessionResponse.id}`,
    body: esqlSession,
  }),
  requestBody: jsonExamples({
    esql: { summary: 'ES|QL tab with requests by extension', value: esqlSession },
  }),
  responses: { 200: sessionResponseExample, 201: sessionResponseExample },
};

export const getDiscoverSessionOASOperationObject = {
  'x-codeSamples': codeSamples({ method: 'GET', suffix: `/${sessionResponse.id}` }),
  responses: { 200: sessionResponseExample },
};

export const searchDiscoverSessionsOASOperationObject = {
  'x-codeSamples': codeSamples({ method: 'GET', suffix: '?query=requests&per_page=20' }),
  responses: {
    200: jsonExamples({
      sessions: { summary: 'One matching Discover session', value: searchResponse },
    }),
  },
};

export const deleteDiscoverSessionOASOperationObject = {
  'x-codeSamples': codeSamples({ method: 'DELETE', suffix: `/${sessionResponse.id}` }),
};

function jsonExamples<T extends Record<string, { summary: string; value: object }>>(examples: T) {
  return { content: { 'application/json': { examples } } };
}

function codeSamples({
  method,
  suffix = '',
  body,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  suffix?: string;
  body?: DiscoverSessionApiDataInput;
}) {
  const lines = [
    `curl -X ${method} "\${KIBANA_URL}${DISCOVER_SESSION_API_BASE_PATH}${suffix}"`,
    '  -H "Authorization: ApiKey ${API_KEY}"',
    `  -H "elastic-api-version: ${DISCOVER_SESSION_API_VERSION}"`,
  ];
  if (method !== 'GET') {
    lines.push('  -H "kbn-xsrf: true"');
  }
  if (body) {
    lines.push(
      '  -H "Content-Type: application/json"',
      `  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`
    );
  }

  return [
    { lang: 'cURL', label: 'cURL', source: lines.join(' \\\n') + '\n' },
    {
      lang: 'Console',
      label: 'Console',
      source:
        `${method} kbn:${DISCOVER_SESSION_API_BASE_PATH}${suffix}\n` +
        (body ? `${JSON.stringify(body, null, 2)}\n` : ''),
    },
  ];
}
