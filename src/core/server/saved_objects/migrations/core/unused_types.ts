/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Types that are no longer registered and need to be removed
 */
export const REMOVED_TYPES: string[] = [
  'apm-services-telemetry',
  'background-session',
  'cases-sub-case',
  'file-upload-telemetry',
  // https://github.com/elastic/kibana/issues/91869
  'fleet-agent-events',
  // https://github.com/elastic/obs-dc-team/issues/334
  'fleet-agents',
  'fleet-agent-actions',
  'fleet-enrollment-api-keys',
  // Was removed in 7.12
  'ml-telemetry',
  'server',
  // https://github.com/elastic/kibana/issues/95617
  'tsvb-validation-telemetry',
  // replaced by osquery-manager-usage-metric
  'osquery-usage-metric',
  // Was removed in 8.1 https://github.com/elastic/kibana/issues/91265
  'siem-detection-engine-rule-status',
  // Was removed in 7.16
  'timelion-sheet',
].sort();

// When migrating from the outdated index we use a read query which excludes
// saved objects which are no longer used. These saved objects will still be
// kept in the outdated index for backup purposes, but won't be available in
// the upgraded index.
export const excludeUnusedTypesQuery: estypes.QueryDslQueryContainer = {
  bool: {
    must_not: [
      ...REMOVED_TYPES.map((typeName) => ({
        term: {
          type: typeName,
        },
      })),
      // https://github.com/elastic/kibana/issues/96131
      {
        bool: {
          must: [
            {
              match: {
                type: 'search-session',
              },
            },
            {
              match: {
                'search-session.persisted': false,
              },
            },
          ],
        },
      },
    ],
  },
};
