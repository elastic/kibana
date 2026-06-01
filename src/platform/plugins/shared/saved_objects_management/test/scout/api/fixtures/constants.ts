/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

// Indexed data the imported dashboards/visualizations target.
export const ES_ARCHIVES = {
  LOGSTASH_FUNCTIONAL: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
  SHAKESPEARE: 'src/platform/test/functional/fixtures/es_archiver/getting_started/shakespeare',
} as const;

export const KBN_ARCHIVES = {
  BASIC: 'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
  REFERENCES:
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/references.json',
  SEARCH: 'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/search.json',
  SCROLL_COUNT:
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/scroll_count.json',
  RELATIONSHIPS:
    'src/platform/test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json',
  FEATURE_CONTROLS_SECURITY:
    'x-pack/platform/test/functional/fixtures/kbn_archives/saved_objects_management/feature_controls/security.json',
  SPACES_INTEGRATION:
    'x-pack/platform/test/functional/fixtures/kbn_archives/saved_objects_management/spaces_integration',
};

// Inspect-view target inside the FEATURE_CONTROLS_SECURITY archive.
export const INSPECT_TARGETS = {
  DASHBOARD_TITLE: 'A Dashboard',
} as const;

// Cross-version saved-object .ndjson exports. Paths are repo-relative so they
// resolve via `Path.resolve(REPO_ROOT, ...)` for both API multipart uploads
// and the UI flyout file picker.
export const NDJSON_EXPORTS = {
  V_7_13_SAVED_OBJECTS:
    'src/platform/plugins/shared/saved_objects_management/test/scout/fixtures/exports/_7.13_import_saved_objects.ndjson',
  V_7_14_ALERTS_ACTIONS:
    'src/platform/plugins/shared/saved_objects_management/test/scout/fixtures/exports/_7.14_import_alerts_actions.ndjson',
  V_8_0_MULTISPACE:
    'src/platform/plugins/shared/saved_objects_management/test/scout/fixtures/exports/_8.0.0_multispace_import.ndjson',
} as const;

// Object counts produced by the cross-version imports above.
export const NDJSON_EXPECTED_COUNTS = {
  V_7_13_SAVED_OBJECTS: 82,
  V_7_14_ALERTS_ACTIONS: 23,
  V_8_0_MULTISPACE: 6,
} as const;

// Dashboard IDs inside `_7.13_import_saved_objects.ndjson`.
export const V_7_13_DASHBOARD_IDS = {
  BY_REFERENCE_DRILLDOWN: '3b844220-ca2b-11eb-bf5e-3de94e83d4f0',
  LENS_COMBINED: 'bfb3dc90-be32-11eb-9520-1b4c3ca6a781',
  LOGSTASH_WITH_FILTERS: '79794f20-6249-11eb-aebf-c306684b328d',
} as const;

// Saved-object titles bundled in FEATURE_CONTROLS_SECURITY. The version-stamped
// "Global Settings" / "Advanced Settings" rows are created at Kibana startup
// and intentionally excluded.
export const FEATURE_CONTROLS_ARCHIVE_TITLES = ['logstash-*', 'A Pie', 'A Dashboard'] as const;

export const FEATURE_CONTROLS_OBJECT_IDS = {
  VISUALIZATION: '75c3e060-1e7c-11e9-8488-65449e65d0ed',
} as const;

export const SAVED_OBJECT_IDS = {
  VISUALIZATION: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
  VISUALIZATION_FROM_SEARCH: 'a42c0580-3224-11e8-a572-ffca06da1357',
  VISUALIZATION_BASIC: 'add810b0-3224-11e8-a572-ffca06da1357',
  SEARCH: '960372e0-3224-11e8-a572-ffca06da1357',
  DASHBOARD: 'b70c7ae0-3224-11e8-a572-ffca06da1357',
  INDEX_PATTERN: '8963ca30-3224-11e8-a572-ffca06da1357',
};

export const MANAGEMENT_API = {
  FIND: '/api/kibana/management/saved_objects/_find',
  RELATIONSHIPS: '/api/kibana/management/saved_objects/relationships',
  SCROLL_COUNT: '/api/kibana/management/saved_objects/scroll/counts',
  BULK_GET: '/api/kibana/management/saved_objects/_bulk_get',
  BULK_DELETE: '/internal/kibana/management/saved_objects/_bulk_delete',
  IMPORT: '/api/saved_objects/_import',
};

export const DEFAULT_TYPES = ['visualization', 'index-pattern', 'search', 'dashboard'];

export function relationshipsUrl(
  type: string,
  id: string,
  types: string[] = DEFAULT_TYPES
): string {
  const typesQuery = types.map((t) => `savedObjectTypes=${t}`).join('&');
  return `${MANAGEMENT_API.RELATIONSHIPS}/${type}/${id}?${typesQuery}`;
}

export function sortRelations<T extends { relationship: string; type: string; id: string }>(
  relations: T[]
): T[] {
  return [...relations].sort((a, b) =>
    `${a.relationship}:${a.type}:${a.id}`.localeCompare(`${b.relationship}:${b.type}:${b.id}`)
  );
}
