/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file is used for documenting/introspecting APIs. Always load it lazily!
 */

import type { VegaCreateRequestBody, VegaCreateResponseBody } from './create/types';
import type { VegaReadResponseBody } from './read/types';
import type { VegaSearchResponseBody } from './search/types';
import type { VegaUpdateRequestBody, VegaUpdateResponseBody } from './update/types';

const createCurlCodeSample = ({
  label,
  method,
  path,
  body,
}: {
  label: string;
  method: 'POST' | 'PUT';
  path: string;
  body: object;
}) => ({
  lang: 'cURL',
  label,
  source:
    [
      `curl -X ${method} "\${KIBANA_URL}${path}" \\`,
      `  -H "Authorization: ApiKey \${API_KEY}" \\`,
      `  -H "kbn-xsrf: true" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '${JSON.stringify(body, null, 2)}'`,
    ].join('\n') + '\n',
});

const createConsoleCodeSample = ({
  label,
  method,
  path,
  body,
}: {
  label: string;
  method: 'POST' | 'PUT';
  path: string;
  body: object;
}) => ({
  lang: 'Console',
  label,
  source: [`${method} kbn:${path}`, JSON.stringify(body, null, 2)].join('\n') + '\n',
});

const VEGA_ID = '7c1d8e40-9b2f-11f0-a5c3-2f6e4b8d9a10';
const SAMPLE_LOGS_DATA_VIEW_ID = '90943e30-9a47-11e8-b64d-95841ca0b247';

const createdMeta = {
  created_at: '2026-09-30T10:00:00.000Z',
  managed: false,
  updated_at: '2026-09-30T10:00:00.000Z',
  version: 'WzU5LDFd',
};

const vegaCreateHjsonBody: VegaCreateRequestBody = {
  title: 'Requests over time',
  description: 'Hourly request count from the sample web logs.',
  spec: {
    format: 'hjson',
    value: [
      '{',
      '  $schema: https://vega.github.io/schema/vega-lite/v5.json',
      '  // Applies the dashboard time range, query, and filters',
      '  data: {',
      '    url: {',
      '      %context%: true',
      '      %timefield%: timestamp',
      '      index: kibana_sample_data_logs',
      '      body: {',
      '        size: 0',
      '        aggs: { hours: { date_histogram: { field: "timestamp", fixed_interval: "1h" } } }',
      '      }',
      '    }',
      '    format: { property: "aggregations.hours.buckets" }',
      '  }',
      '  mark: line',
      '  encoding: {',
      '    x: { field: "key", type: "temporal", title: null }',
      '    y: { field: "doc_count", type: "quantitative", title: "Requests" }',
      '  }',
      '}',
    ].join('\n'),
  },
};

const vegaCreateFilteredBody: VegaCreateRequestBody = {
  title: 'Top extensions (US, macOS)',
  spec: {
    format: 'json',
    value: {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: {
        url: {
          '%context%': true,
          '%timefield%': 'timestamp',
          index: 'kibana_sample_data_logs',
          body: {
            size: 0,
            aggs: { extensions: { terms: { field: 'extension.keyword' } } },
          },
        },
        format: { property: 'aggregations.extensions.buckets' },
      },
      mark: 'bar',
      encoding: {
        x: { field: 'key', type: 'nominal' },
        y: { field: 'doc_count', type: 'quantitative' },
      },
    },
  },
  query: { expression: 'machine.os.keyword : "osx"', language: 'kql' },
  filters: [
    {
      type: 'condition',
      data_view_id: SAMPLE_LOGS_DATA_VIEW_ID,
      condition: { field: 'geo.dest', operator: 'is', value: 'US' },
    },
    { type: 'dsl', dsl: { range: { bytes: { gte: 1000 } } } },
  ],
};

const vegaUpdateBody: VegaUpdateRequestBody = {
  ...vegaCreateFilteredBody,
  title: 'Top extensions (US, Windows)',
  query: { expression: 'machine.os.keyword : win*', language: 'kql' },
};

const vegaCreateCodeSamples = [
  createCurlCodeSample({
    label: 'Create a Vega library item - cURL',
    method: 'POST',
    path: '/api/vega',
    body: vegaCreateHjsonBody,
  }),
  createConsoleCodeSample({
    label: 'Create a Vega library item - Console',
    method: 'POST',
    path: '/api/vega',
    body: vegaCreateHjsonBody,
  }),
];

const vegaSearchCodeSamples = [
  {
    lang: 'cURL',
    label: 'Search Vega library items - cURL',
    source:
      'curl -X GET "${KIBANA_URL}/api/vega?query=requests&per_page=10" \\\n' +
      '  -H "Authorization: ApiKey ${API_KEY}"\n',
  },
  {
    lang: 'Console',
    label: 'Search Vega library items - Console',
    source: 'GET kbn:/api/vega?query=requests&per_page=10\n',
  },
];

const vegaReadCodeSamples = [
  {
    lang: 'cURL',
    label: 'Get a Vega library item - cURL',
    source: `curl -X GET "\${KIBANA_URL}/api/vega/${VEGA_ID}" \\\n  -H "Authorization: ApiKey \${API_KEY}"\n`,
  },
  {
    lang: 'Console',
    label: 'Get a Vega library item - Console',
    source: `GET kbn:/api/vega/${VEGA_ID}\n`,
  },
];

const vegaUpdateCodeSamples = [
  createCurlCodeSample({
    label: 'Upsert a Vega library item - cURL',
    method: 'PUT',
    path: `/api/vega/${VEGA_ID}`,
    body: vegaUpdateBody,
  }),
  createConsoleCodeSample({
    label: 'Upsert a Vega library item - Console',
    method: 'PUT',
    path: `/api/vega/${VEGA_ID}`,
    body: vegaUpdateBody,
  }),
];

const vegaDeleteCodeSamples = [
  {
    lang: 'cURL',
    label: 'Delete a Vega library item - cURL',
    source: `curl -X DELETE "\${KIBANA_URL}/api/vega/${VEGA_ID}" \\\n  -H "Authorization: ApiKey \${API_KEY}" \\\n  -H "kbn-xsrf: true"\n`,
  },
  {
    lang: 'Console',
    label: 'Delete a Vega library item - Console',
    source: `DELETE kbn:/api/vega/${VEGA_ID}\n`,
  },
];

const vegaCreateRequestExamples = {
  createHjsonVega: {
    summary: 'Create a Vega library item with an HJSON spec',
    value: vegaCreateHjsonBody,
  },
  createFilteredVega: {
    summary: 'Create a Vega library item with a JSON spec, filters, and a KQL query',
    description:
      'The filters and query are applied to data sources that use `%context%: true`, together with the dashboard query and filters.',
    value: vegaCreateFilteredBody,
  },
};

const vegaUpdateRequestExamples = {
  upsertVega: {
    summary: 'Upsert a Vega library item',
    value: vegaUpdateBody,
  },
};

const vegaCreateResponseExamples = {
  createVegaResponse: {
    summary: 'Create Vega library item response',
    description: 'Returns the generated ID, the full item state in `data`, and metadata.',
    value: {
      id: VEGA_ID,
      data: vegaCreateHjsonBody,
      meta: createdMeta,
    } satisfies VegaCreateResponseBody,
  },
};

const vegaSearchResponseExamples = {
  searchVegaResponse: {
    summary: 'Search Vega library items response',
    description:
      'Paginated list of Vega library item summaries with `title`, `description`, and metadata. The spec, query, and filters are not included; use `GET /api/vega/{id}` to retrieve a specific item.',
    value: {
      data: [
        {
          id: VEGA_ID,
          data: {
            title: vegaCreateHjsonBody.title,
            description: vegaCreateHjsonBody.description,
          },
          meta: createdMeta,
        },
      ],
      meta: { page: 1, per_page: 10, total: 1 },
    } satisfies VegaSearchResponseBody,
  },
};

const vegaReadResponseExamples = {
  getVegaResponse: {
    summary: 'Get Vega library item response',
    description:
      'The full Vega library item state including the spec, query, filters, and metadata.',
    value: {
      id: VEGA_ID,
      data: vegaCreateFilteredBody,
      meta: createdMeta,
    } satisfies VegaReadResponseBody,
  },
};

const vegaUpdateResponseExamples = {
  updatedVegaResponse: {
    summary: 'Update Vega library item response',
    description:
      'The complete updated state. PUT replaces the entire item, so fields omitted from the request, such as `query` or `filters`, are removed.',
    value: {
      id: VEGA_ID,
      data: vegaUpdateBody,
      meta: {
        ...createdMeta,
        updated_at: '2026-09-30T11:00:00.000Z',
        version: 'WzYwLDFd',
      },
    } satisfies VegaUpdateResponseBody,
  },
};

const vegaUpdateCreatedResponseExamples = {
  createdVegaResponse: {
    summary: 'Create Vega library item response (via upsert)',
    description: 'Returned when no item existed with the specified ID and a new one was created.',
    value: {
      id: VEGA_ID,
      data: vegaUpdateBody,
      meta: createdMeta,
    } satisfies VegaUpdateResponseBody,
  },
};

export const createVegaOASOperationObject = {
  'x-codeSamples': vegaCreateCodeSamples,
  requestBody: {
    content: {
      'application/json': {
        examples: vegaCreateRequestExamples,
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          examples: vegaCreateResponseExamples,
        },
      },
    },
  },
};

export const searchVegaOASOperationObject = {
  'x-codeSamples': vegaSearchCodeSamples,
  responses: {
    200: {
      content: {
        'application/json': {
          examples: vegaSearchResponseExamples,
        },
      },
    },
  },
};

export const readVegaOASOperationObject = {
  'x-codeSamples': vegaReadCodeSamples,
  responses: {
    200: {
      content: {
        'application/json': {
          examples: vegaReadResponseExamples,
        },
      },
    },
  },
};

export const updateVegaOASOperationObject = {
  'x-codeSamples': vegaUpdateCodeSamples,
  requestBody: {
    content: {
      'application/json': {
        examples: vegaUpdateRequestExamples,
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          examples: vegaUpdateResponseExamples,
        },
      },
    },
    201: {
      content: {
        'application/json': {
          examples: vegaUpdateCreatedResponseExamples,
        },
      },
    },
  },
};

export const deleteVegaOASOperationObject = {
  'x-codeSamples': vegaDeleteCodeSamples,
  responses: {
    204: {
      description: 'No content, the Vega library item was successfully deleted.',
    },
  },
};
