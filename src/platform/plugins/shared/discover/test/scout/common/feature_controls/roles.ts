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
 * Role descriptors shared by the Discover feature-controls API and UI Scout suites.
 * Keeping them in a single module avoids drift between the two test layers (a stale
 * role in one file would silently weaken coverage).
 */

export const LOGSTASH_READ_INDEX_PRIVILEGE = {
  names: ['logstash-*'],
  privileges: ['read', 'view_index_metadata'],
};

export const DISCOVER_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};

export const DISCOVER_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};

export const DISCOVER_READ_URL_CREATE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { discover: ['read', 'url_create'] }, spaces: ['*'] }],
};

/**
 * The lookup-join index-editor routes (`src/platform/plugins/shared/esql/server/routes/lookup_index.ts`)
 * disable Kibana route authorization and delegate entirely to the scoped ES client, so creating,
 * editing, closing, or deleting a lookup index is gated purely by Elasticsearch index privileges on
 * the target index name — no built-in Kibana role (`viewer`/`editor`/`admin`) grants `create_index`/
 * `delete_index`/`manage` on non-system indices. Scoped to the `test-lookup-index-*` prefix used by
 * the lookup-index-editor Scout specs.
 */
export const LOOKUP_INDEX_EDITOR_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['manage_ingest_pipelines'],
    indices: [
      LOGSTASH_READ_INDEX_PRIVILEGE,
      {
        names: ['test-lookup-index-*'],
        privileges: ['create_index', 'read', 'write', 'delete_index', 'manage'],
      },
      {
        names: ['*'],
        privileges: ['create_index'],
      },
    ],
  },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};
