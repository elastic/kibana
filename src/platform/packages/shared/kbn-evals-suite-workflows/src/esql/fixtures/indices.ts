/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * Fixture index mappings for the `workflow-esql` dataset. Copied from
 * `x-pack/solutions/security/packages/kbn-evals-suite-security-esql-generation-regression/src/fixtures`
 * because a platform package cannot depend on a security solution package.
 * One concrete index per template; cleanup deletes by wildcard.
 */

export const postgresLogsIndexCreateRequest: IndicesCreateRequest = {
  index: 'postgres-logs-production.evaluations.2025.01.01',
  mappings: {
    properties: {
      message: { type: 'text' },
    },
  },
};

export const packetbeatIndexCreateRequest: IndicesCreateRequest = {
  index: 'packetbeat-production.evaluations.2025.01.01',
  mappings: {
    properties: {
      destination: {
        properties: {
          domain: { type: 'keyword' },
        },
      },
    },
  },
};

export const nycTaxisIndexCreateRequest: IndicesCreateRequest = {
  index: 'nyc_taxis-production.evaluations.2025.01.01',
  mappings: {
    properties: {
      drop_off_time: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis',
      },
    },
  },
};

export const metricbeatIndexCreateRequest: IndicesCreateRequest = {
  index: 'metricbeat-production.evaluations-2025.01.01',
  mappings: {
    properties: {
      system: {
        properties: {
          cpu: {
            properties: {
              user: { properties: { pct: { type: 'float' } } },
              system: { properties: { pct: { type: 'float' } } },
              cores: { type: 'integer' },
            },
          },
        },
      },
      host: {
        properties: {
          name: { type: 'keyword' },
        },
      },
    },
  },
};

export const employeesIndexCreateRequest: IndicesCreateRequest = {
  index: 'employees-production.evaluations.2025.01.01',
  mappings: {
    properties: {
      emp_no: { type: 'keyword' },
      hire_date: {
        type: 'date',
        format: 'yyyy-MM-dd',
      },
      salary: { type: 'double' },
    },
  },
};

export const logsIndexCreateRequest: IndicesCreateRequest = {
  index: 'logs-production.evaluations.2025.01.01',
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      bytes_transferred: { type: 'long' },
      command_line: { type: 'text' },
      destination: {
        properties: {
          ip: { type: 'ip' },
          port: { type: 'long' },
          address: { type: 'keyword' },
        },
      },
      dns: {
        properties: {
          question: {
            properties: {
              name: { type: 'keyword' },
              registered_domain: { type: 'keyword' },
            },
          },
        },
      },
      error_code: { type: 'keyword' },
      event: {
        properties: {
          action: { type: 'keyword' },
          code: { type: 'long' },
        },
      },
      file: {
        properties: {
          name: { type: 'text' },
        },
      },
      group: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      host: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      ip: { type: 'ip' },
      log: {
        properties: {
          message: { type: 'text' },
        },
      },
      network: {
        properties: {
          bytes: { type: 'long' },
          direction: { type: 'keyword' },
        },
      },
      process: {
        properties: {
          name: { type: 'keyword' },
          working_directory: { type: 'keyword' },
        },
      },
      source: {
        properties: {
          ip: { type: 'ip' },
          bytes: { type: 'long' },
        },
      },
      system: {
        properties: {
          cpu: {
            properties: {
              total: {
                properties: {
                  norm: { properties: { pct: { type: 'float' } } },
                },
              },
            },
          },
        },
      },
      url: {
        properties: {
          domain: { type: 'keyword' },
        },
      },
      user: {
        properties: {
          name: { type: 'keyword' },
        },
      },
      user_agent: {
        properties: {
          original: { type: 'text' },
        },
      },
    },
  },
};

export const esqlFixtureIndicesCreateRequests: readonly IndicesCreateRequest[] = [
  postgresLogsIndexCreateRequest,
  packetbeatIndexCreateRequest,
  nycTaxisIndexCreateRequest,
  metricbeatIndexCreateRequest,
  employeesIndexCreateRequest,
  logsIndexCreateRequest,
];

/**
 * Wildcard patterns covering every fixture index, including the
 * `traces-apm-*` and `metrics-apm-*` indices created implicitly by the
 * document-index requests in `./documents.ts`. Used for cleanup so any
 * drift in the concrete names is still swept.
 */
export const esqlFixtureIndexWildcards: readonly string[] = [
  'postgres-logs-*',
  'packetbeat-*',
  'nyc_taxis-*',
  'metricbeat-*',
  'employees-*',
  'logs-production.evaluations.*',
  'traces-apm-*',
  'metrics-apm-*',
];
