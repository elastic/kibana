/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildExcludeUnusedTypesQuery, REMOVED_TYPES } from './unused_types';

describe('buildExcludeUnusedTypesQuery', () => {
  it('should build the correct query with REMOVED_TYPES', () => {
    const query = buildExcludeUnusedTypesQuery(REMOVED_TYPES);
    expect(query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "must_not": Array [
            Object {
              "term": Object {
                "type": "apm-services-telemetry",
              },
            },
            Object {
              "term": Object {
                "type": "application_usage_transactional",
              },
            },
            Object {
              "term": Object {
                "type": "background-session",
              },
            },
            Object {
              "term": Object {
                "type": "cases-sub-case",
              },
            },
            Object {
              "term": Object {
                "type": "csp_rule",
              },
            },
            Object {
              "term": Object {
                "type": "endpoint:user-artifact",
              },
            },
            Object {
              "term": Object {
                "type": "file-upload-telemetry",
              },
            },
            Object {
              "term": Object {
                "type": "fleet-agent-actions",
              },
            },
            Object {
              "term": Object {
                "type": "fleet-agent-events",
              },
            },
            Object {
              "term": Object {
                "type": "fleet-agents",
              },
            },
            Object {
              "term": Object {
                "type": "fleet-enrollment-api-keys",
              },
            },
            Object {
              "term": Object {
                "type": "guided-setup-state",
              },
            },
            Object {
              "term": Object {
                "type": "investigation",
              },
            },
            Object {
              "term": Object {
                "type": "maps-telemetry",
              },
            },
            Object {
              "term": Object {
                "type": "ml-telemetry",
              },
            },
            Object {
              "term": Object {
                "type": "osquery-usage-metric",
              },
            },
            Object {
              "term": Object {
                "type": "server",
              },
            },
            Object {
              "term": Object {
                "type": "siem-detection-engine-rule-execution-info",
              },
            },
            Object {
              "term": Object {
                "type": "siem-detection-engine-rule-status",
              },
            },
            Object {
              "term": Object {
                "type": "timelion-sheet",
              },
            },
            Object {
              "term": Object {
                "type": "tsvb-validation-telemetry",
              },
            },
            Object {
              "term": Object {
                "type": "ui-counter",
              },
            },
            Object {
              "term": Object {
                "type": "upgrade-assistant-telemetry",
              },
            },
          ],
        },
      }
    `);
  });
});
