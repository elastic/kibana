/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';

// When migrating from the outdated index we use a read query which excludes
// saved objects which are no longer used. These saved objects will still be
// kept in the outdated index for backup purposes, but won't be availble in
// the upgraded index.
export const excludeUnusedTypesQuery: estypes.QueryContainer = {
  bool: {
    must_not: [
      // https://github.com/elastic/kibana/issues/91869
      {
        term: {
          type: 'fleet-agent-events',
        },
      },
      // https://github.com/elastic/kibana/issues/95617
      {
        term: {
          type: 'tsvb-validation-telemetry',
        },
      },
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
