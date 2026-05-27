/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

export const ES_ARCHIVES = {
  LOGSTASH_FUNCTIONAL: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
};

export const KBN_ARCHIVES = {
  SAVED_QUERY_BUNDLE:
    'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard/feature_controls/security/security.json',
};

/**
 * Pre-existing saved query bundled in the KBN archive: query `response:200`
 * filtered on `extension.raw:jpg`. Used by the read-only spec to validate
 * "load" without depending on the CRUD spec.
 */
export const PRELOADED_SAVED_QUERY = {
  title: 'OKJpgs',
  query: 'response:200',
} as const;

/**
 * Limit UI specs to local stateful runs — `browserAuth.loginWithCustomRole`
 * is not yet supported on Elastic Cloud Hosted (ECH).
 */
export const SQM_UI_TAG = '@local-stateful-classic';

const LOGSTASH_ES_READ = {
  cluster: [],
  indices: [{ names: ['logstash-*', 'logs*'], privileges: ['read', 'view_index_metadata'] }],
};

/** Discover feature `all` + global savedQueryManagement `all` (used by CRUD spec). */
export const DISCOVER_ALL_SQM_ALL_ROLE: KibanaRole = {
  elasticsearch: LOGSTASH_ES_READ,
  kibana: [
    {
      base: [],
      spaces: ['*'],
      feature: { discover_v2: ['all'], savedQueryManagement: ['all'] },
    },
  ],
};

/** Discover feature `read` + global savedQueryManagement `read` (used by read-only spec). */
export const DISCOVER_READ_SQM_READ_ROLE: KibanaRole = {
  elasticsearch: LOGSTASH_ES_READ,
  kibana: [
    {
      base: [],
      spaces: ['*'],
      feature: { discover_v2: ['read'], savedQueryManagement: ['read'] },
    },
  ],
};

/** Cross-app super-role (all v2 features `all` + savedQueryManagement `all`). */
export const ALL_APPS_SQM_ALL_ROLE: KibanaRole = {
  elasticsearch: LOGSTASH_ES_READ,
  kibana: [
    {
      base: [],
      spaces: ['*'],
      feature: {
        discover_v2: ['all'],
        dashboard_v2: ['all'],
        maps_v2: ['all'],
        visualize_v2: ['all'],
        savedQueryManagement: ['all'],
      },
    },
  ],
};

export type FeaturePrivilege = 'read' | 'all';
export type SqmPrivilege = 'none' | 'read' | 'all';

/**
 * Builds a Discover v2 role with the given feature + savedQueryManagement
 * privilege combo. Mirrors `buildSavedQueryRole` in the API fixtures so the UI
 * matrix glue spec exercises the same role shape as the capability API tests.
 */
export const buildDiscoverV2Role = (
  featurePriv: FeaturePrivilege,
  sqmPriv: SqmPrivilege
): KibanaRole => {
  const featureBlock: Record<string, string[]> = { discover_v2: [featurePriv] };
  if (sqmPriv !== 'none') {
    featureBlock.savedQueryManagement = [sqmPriv];
  }
  return {
    elasticsearch: LOGSTASH_ES_READ,
    kibana: [{ base: [], spaces: ['*'], feature: featureBlock }],
  };
};

export interface SavedQueryAffordancesExpectation {
  loadVisible: boolean;
  saveVisible: boolean;
  saveEnabled: boolean;
}

export interface SavedQueryUiMatrixCase {
  label: string;
  featurePriv: FeaturePrivilege;
  sqmPriv: SqmPrivilege;
  expected: SavedQueryAffordancesExpectation;
}

/**
 * Representative subset of `V2_MATRIX` (see the API fixtures) used by the UI
 * matrix glue spec. Three cells are enough to re-bind the
 * capability → popover contract end-to-end across the network without paying
 * for the full 6-cell matrix in UI cost:
 *   - `all + all`  — section visible, save enabled-eligible.
 *   - `all + read` — section visible but save gated (the most regression-prone
 *      cell, since `canShowSavedQuery` derives `showSaveQuery=false`).
 *   - `all + none` — section absent (the cell the deleted FTR
 *      `feature_controls` UI suite relied on; per-cell capabilities are
 *      already asserted by `capabilities_v2_explicit.spec.ts`).
 *
 * `saveEnabled` is intentionally `false` everywhere: the spec opens a fresh
 * Discover page with no query/filter set, so the save item is disabled even
 * when the user has `saveQuery: true`. The Jest derivation test
 * (`query_bar_menu.privileges.test.tsx`) covers the enabled/disabled flips.
 */
export const SAVED_QUERY_UI_MATRIX: readonly SavedQueryUiMatrixCase[] = [
  {
    label: 'discover_v2:all + sqm:all renders the saved-query section',
    featurePriv: 'all',
    sqmPriv: 'all',
    expected: { loadVisible: true, saveVisible: true, saveEnabled: false },
  },
  {
    label: 'discover_v2:all + sqm:read renders the section with save disabled',
    featurePriv: 'all',
    sqmPriv: 'read',
    expected: { loadVisible: true, saveVisible: true, saveEnabled: false },
  },
  {
    label: 'discover_v2:all + sqm:none hides the entire saved-query section',
    featurePriv: 'all',
    sqmPriv: 'none',
    expected: { loadVisible: false, saveVisible: false, saveEnabled: false },
  },
] as const;
