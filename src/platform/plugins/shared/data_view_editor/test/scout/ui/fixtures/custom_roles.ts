/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

// KibanaRole requires both `base` and `feature` in kibana entries, and `cluster`
// in elasticsearch (use empty arrays/objects when those privileges are not needed).
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  // Kibana indexPatterns:all + ES read access on the test data stream.
  index_pattern_management_all: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['test_data_stream'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [{ base: [], feature: { indexPatterns: ['all'] }, spaces: ['*'] }],
  },
};
