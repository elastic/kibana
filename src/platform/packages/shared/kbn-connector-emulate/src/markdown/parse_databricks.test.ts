/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadContractOperations } from '../openapi';
import { convertMarkdownReference } from '.';

const BASE = 'https://docs.databricks.com/api';

// Excerpts of docs.databricks.com/api pages.
const runNow = [
  '# Trigger a new job run',
  '',
  'Launch stage: GA',
  '',
  '`POST /api/2.2/jobs/run-now`',
  '',
  'Run a job and return the `run_id` of the triggered run.',
  '',
  'API scopes: jobs',
  '',
  '## Request body',
  '',
  '- `job_id` (int64, required)',
  '  The ID of the job to be executed',
  '  Example: `11223344`',
  '- `queue` (object, optional)',
  '  The queue settings of the run.',
  '  - `enabled` (boolean, required)',
  '    If true, enable queueing for the job. This is a required field.',
  '    Default: `true`',
  '- `only` (array of string, optional)',
  '  A list of task keys to run inside of the job.',
  '  Example: `notebook_task_1`',
  '- `performance_target` (string, optional)',
  '  The performance mode on a serverless job.',
  '  ',
  '   * `STANDARD`: Enables cost-efficient execution of serverless workloads.',
  '  Possible values:',
  '  - `PERFORMANCE_OPTIMIZED`',
  '  - `STANDARD`',
  '',
  '## Returns',
  '',
  '- `run_id` (int64, optional)',
  '  The globally unique ID of the newly triggered run.',
  '- `number_in_job` (int64, optional, Deprecated)',
  '  A unique identifier for this job run.',
  '',
  '## Response',
  '',
  '```json',
  '{',
  '  "run_id": 455644833,',
  '  "number_in_job": 455644833',
  '}',
  '```',
].join('\n');

const listAlerts = [
  '# List alerts',
  '',
  '`GET /api/2.0/sql/alerts`',
  '',
  '## Query parameters',
  '',
  '- `page_token` (string, optional)',
  '- `page_size` (int32, optional)',
  '  Default: `20`',
  '  Constraints: `[ 1 .. 100 ]`',
  '- `filter` (string, optional)',
  '  Constraints: `<= 255 characters`, `^[\\w-]+$`',
  '',
  '## Returns',
  '',
  '- `results` (array of object, optional)',
  '  - `id` (string, optional, ID, Immutable)',
  '    UUID identifying the alert.',
  '  - `state` (string, optional)',
  '    Possible values:',
  '    - `UNKNOWN`',
  '    - `OK`',
  '- `next_page_token` (string, optional)',
].join('\n');

const getAlert = (version: string) =>
  [
    '# Get an alert',
    '',
    `\`GET /api/2.0/${version === 'v1' ? 'sql/' : ''}alerts/{id}\``,
    '',
    '## Path parameters',
    '',
    '- `id` (string, required)',
    '',
    '## Returns',
    '',
    'Returns the Alert object.',
    '',
    '## Response',
    '',
    '```json',
    '{ "id": "1927647905808833" }',
    '```',
  ].join('\n');

const alertObject = (field: string) =>
  [
    '# The Alert object',
    '',
    '## Attributes',
    '',
    `- \`${field}\` (string)`,
    '  UUID identifying the alert.',
    '',
    '## Example',
    '',
    '```json',
    `{ "${field}": "1927647905808833" }`,
    '```',
  ].join('\n');

const groupIndex = ['# Run', '', '## Endpoints', '', '### Get a single job run'].join('\n');

const convert = (pages: Array<[string, string]>) =>
  convertMarkdownReference({
    format: 'databricks-markdown',
    pages: pages.map(([path, markdown]) => ({ url: `${BASE}/${path}.md`, markdown })),
  });

describe('convertMarkdownReference: databricks-markdown', () => {
  it('converts an endpoint page with its nested request body, enums, defaults and response', () => {
    const document = convert([['jobs/v2/run-now', runNow]]);

    expect(document.servers).toEqual([
      {
        url: 'https://{workspace}',
        variables: { workspace: { default: 'example.cloud.databricks.com' } },
      },
    ]);
    expect(document.paths).toEqual({
      '/api/2.2/jobs/run-now': {
        post: {
          operationId: 'jobs/v2/run-now',
          summary: 'Trigger a new job run',
          description: 'Run a job and return the `run_id` of the triggered run.',
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['job_id'],
                  properties: {
                    job_id: {
                      type: 'integer',
                      format: 'int64',
                      description: 'The ID of the job to be executed',
                      example: 11223344,
                    },
                    queue: {
                      type: 'object',
                      description: 'The queue settings of the run.',
                      required: ['enabled'],
                      properties: {
                        enabled: {
                          type: 'boolean',
                          description:
                            'If true, enable queueing for the job. This is a required field.',
                          default: true,
                        },
                      },
                    },
                    only: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'A list of task keys to run inside of the job.',
                    },
                    performance_target: {
                      type: 'string',
                      enum: ['PERFORMANCE_OPTIMIZED', 'STANDARD'],
                      description:
                        'The performance mode on a serverless job.\n\n* `STANDARD`: Enables cost-efficient execution of serverless workloads.',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      run_id: {
                        type: 'integer',
                        format: 'int64',
                        description: 'The globally unique ID of the newly triggered run.',
                      },
                      number_in_job: {
                        type: 'integer',
                        format: 'int64',
                        deprecated: true,
                        description: 'A unique identifier for this job run.',
                      },
                    },
                  },
                  example: { run_id: 455644833, number_in_job: 455644833 },
                },
              },
            },
          },
          security: [{ bearerAuth: [] }],
        },
      },
    });
    expect(document.components).toEqual({
      schemas: {},
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    });
  });

  it('keeps strict bounds exclusive, and moves length and count bounds by one', () => {
    const page = [
      '# List things',
      '',
      '`GET /api/2.0/things`',
      '',
      '## Query parameters',
      '',
      '- `ratio` (double, optional)',
      '  Constraints: `> 0`, `< 1`',
      '- `limit` (int32, optional)',
      '  Constraints: `>= 1`, `<= 100`',
      '- `name` (string, optional)',
      '  Constraints: `> 0 characters`, `< 64 characters`',
      '- `ids` (array of string, optional)',
      '  Constraints: `> 1 items`, `<= 10 items`',
    ].join('\n');
    const [operation] = loadContractOperations(convert([['things/v2/list-things', page]]));

    expect(operation.parameters.map(({ name, schema }) => [name, schema?.schema])).toEqual([
      [
        'ratio',
        {
          type: 'number',
          format: 'double',
          exclusiveMinimum: 0,
          exclusiveMaximum: 1,
        },
      ],
      ['limit', { type: 'integer', format: 'int32', minimum: 1, maximum: 100 }],
      ['name', { type: 'string', minLength: 1, maxLength: 63 }],
      ['ids', { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 10 }],
    ]);
  });

  it('reads query parameters with their bounds and patterns, and arrays of objects', () => {
    const document = convert([['alerts/v1/list-alerts', listAlerts]]);
    const [operation] = loadContractOperations(document);

    expect(
      operation.parameters.map(({ name, in: location, required, schema }) => ({
        name,
        in: location,
        required,
        schema: schema?.schema,
      }))
    ).toEqual([
      { name: 'page_token', in: 'query', required: false, schema: { type: 'string' } },
      {
        name: 'page_size',
        in: 'query',
        required: false,
        schema: { type: 'integer', format: 'int32', minimum: 1, maximum: 100, default: 20 },
      },
      {
        name: 'filter',
        in: 'query',
        required: false,
        schema: { type: 'string', maxLength: 255, pattern: '^[\\w-]+$' },
      },
    ]);
    expect(
      (document.paths as Record<string, Record<string, Record<string, unknown>>>)[
        '/api/2.0/sql/alerts'
      ].get.responses
    ).toEqual({
      '200': {
        description: 'Response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'UUID identifying the alert.' },
                      state: { type: 'string', enum: ['UNKNOWN', 'OK'] },
                    },
                  },
                },
                next_page_token: { type: 'string' },
              },
            },
          },
        },
      },
    });
  });

  it('turns object pages into schemas that responses refer to, qualified by API group when shared', () => {
    const document = convert([
      ['alerts/v1/get-alert', getAlert('v1')],
      ['alerts/v1/alert/object', alertObject('id')],
      ['alerts/v2/get-alert', getAlert('v2')],
      ['alerts/v2/alert/object', alertObject('alert_id')],
      ['jobs/v2/run', groupIndex],
    ]);
    const schemaOf = (path: string) =>
      (document.paths as Record<string, Record<string, Record<string, unknown>>>)[path].get
        .responses;

    expect(schemaOf('/api/2.0/sql/alerts/{id}')).toEqual({
      '200': {
        description: 'Response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AlertsV1Alert' },
            example: { id: '1927647905808833' },
          },
        },
      },
    });
    expect(schemaOf('/api/2.0/alerts/{id}')).toMatchObject({
      '200': {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AlertsV2Alert' } },
        },
      },
    });
    expect(document.components).toMatchObject({
      schemas: {
        AlertsV1Alert: {
          type: 'object',
          properties: { id: { type: 'string', description: 'UUID identifying the alert.' } },
          example: { id: '1927647905808833' },
        },
        AlertsV2Alert: { properties: { alert_id: { type: 'string' } } },
      },
    });
    expect(Object.keys(document.paths as object)).toEqual([
      '/api/2.0/sql/alerts/{id}',
      '/api/2.0/alerts/{id}',
    ]);
  });
});
