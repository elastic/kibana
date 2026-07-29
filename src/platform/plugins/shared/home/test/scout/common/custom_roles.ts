/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

// Custom roles shared by the Home plugin's Scout UI and API tests.
//
// KibanaRole requires both `base` and `feature` in kibana entries, and `cluster`
// in elasticsearch (use empty arrays/objects when those privileges are not needed).
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  // Kibana base:all across all spaces. Sees every registered solution panel
  // and the Stack Management quick-link on the Home page.
  global_all: {
    elasticsearch: { cluster: [] },
    kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
  },

  // dashboard:all only — no management privileges and no other solution access.
  // Sees only the Kibana solution panel and the Manage section is hidden.
  global_dashboard_all: {
    elasticsearch: { cluster: [] },
    kibana: [{ base: [], feature: { dashboard: ['all'] }, spaces: ['*'] }],
  },
};
