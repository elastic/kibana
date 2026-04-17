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

export const KBN_ARCHIVES = {
  BASIC: 'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
  REFERENCES:
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/references.json',
  SEARCH: 'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/search.json',
  SCROLL_COUNT:
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/scroll_count.json',
  RELATIONSHIPS:
    'src/platform/test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json',
};

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
