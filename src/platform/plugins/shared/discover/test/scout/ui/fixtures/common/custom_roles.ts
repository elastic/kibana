/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Custom role used by the `panels_toggle_*` specs that exercise the wildcard
 * `log*` data view. The built-in `admin` / `viewer` / `editor` roles grant
 * read on all non-system indices, so `log*` resolves to every `log*` index
 * the test cluster happens to contain (e.g. unrelated archives loaded by
 * other parallel suites). That makes hit-count assertions like `'14,004'`
 * non-deterministic.
 *
 * Restricting the role to `logstash*` pins `log*` to the `logstash_functional`
 * fixture indices and keeps the migrated FTR hit counts stable. Prefer
 * `browserAuth.loginAsAdmin()` whenever a spec does not depend on index-set
 * isolation; this role is intentionally narrow.
 */
export const DISCOVER_LOGSTASH_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['logstash*'],
        privileges: ['read', 'view_index_metadata'],
      },
      {
        names: ['*'],
        privileges: ['read_view_metadata'],
      },
    ],
  },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};
