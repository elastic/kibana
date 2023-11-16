/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

export const emptyResponseClientMock = elasticsearchClientMock.createInternalClient(
  Promise.resolve({
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 0,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
  })
);

export const initialExcludeOnUpgradeQueryMock = {
  bool: {
    must_not: [
      {
        term: {
          type: 'apm-services-telemetry',
        },
      },
      {
        term: {
          type: 'application_usage_transactional',
        },
      },
      {
        term: {
          type: 'background-session',
        },
      },
      {
        term: {
          type: 'cases-sub-case',
        },
      },
      {
        term: {
          type: 'csp_rule',
        },
      },
      {
        term: {
          type: 'file-upload-telemetry',
        },
      },
      {
        term: {
          type: 'fleet-agent-actions',
        },
      },
      {
        term: {
          type: 'fleet-agent-events',
        },
      },
      {
        term: {
          type: 'fleet-agents',
        },
      },
      {
        term: {
          type: 'fleet-enrollment-api-keys',
        },
      },
      {
        term: {
          type: 'guided-setup-state',
        },
      },
      {
        term: {
          type: 'maps-telemetry',
        },
      },
      {
        term: {
          type: 'ml-telemetry',
        },
      },
      {
        term: {
          type: 'osquery-manager-usage-metric',
        },
      },
      {
        term: {
          type: 'osquery-usage-metric',
        },
      },
      {
        term: {
          type: 'server',
        },
      },
      {
        term: {
          type: 'siem-detection-engine-rule-execution-info',
        },
      },
      {
        term: {
          type: 'siem-detection-engine-rule-status',
        },
      },
      {
        term: {
          type: 'timelion-sheet',
        },
      },
      {
        term: {
          type: 'tsvb-validation-telemetry',
        },
      },
      {
        term: {
          type: 'ui-counter',
        },
      },
    ],
  },
};
