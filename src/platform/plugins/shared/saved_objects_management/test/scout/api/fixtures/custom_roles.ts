/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

// Roles used by the SOM feature_controls suites: full access, SOM read-only,
// and a no-SOM role that should hit the appNotFoundPage.
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  global_all: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
  },

  global_som_read: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [
      {
        base: [],
        feature: { savedObjectsManagement: ['read'] },
        spaces: ['*'],
      },
    ],
  },

  global_visualize_all: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [
      {
        base: [],
        feature: { visualize: ['minimal_all'] },
        spaces: ['*'],
      },
    ],
  },
};
