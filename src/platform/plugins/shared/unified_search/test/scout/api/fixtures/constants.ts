/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

/**
 * v1 features have an implicit savedQueryManagement capability tied to the
 * feature's `all` privilege. v2 features require an explicit
 * `savedQueryManagement` feature privilege.
 */
export type FeatureName =
  | 'discover'
  | 'discover_v2'
  | 'dashboard'
  | 'dashboard_v2'
  | 'maps'
  | 'maps_v2'
  | 'visualize'
  | 'visualize_v2';

export type FeaturePrivilege = 'read' | 'all';
export type SqmPrivilege = 'none' | 'read' | 'all';

export const V1_FEATURES: FeatureName[] = ['discover', 'dashboard', 'maps', 'visualize'];
export const V2_FEATURES: FeatureName[] = [
  'discover_v2',
  'dashboard_v2',
  'maps_v2',
  'visualize_v2',
];

/**
 * Builds a single-space Kibana role with the given feature + savedQueryManagement
 * privilege combo. We pass `read` on `logstash-*` so all four apps can resolve
 * an index pattern when the UI tests reuse the same role.
 */
export const buildSavedQueryRole = (
  feature: FeatureName,
  featurePriv: FeaturePrivilege,
  sqmPriv: SqmPrivilege
): KibanaRole => {
  const featureBlock: Record<string, string[]> = { [feature]: [featurePriv] };
  if (sqmPriv !== 'none') {
    featureBlock.savedQueryManagement = [sqmPriv];
  }
  return {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [{ base: [], spaces: ['*'], feature: featureBlock }],
  };
};

export interface CapabilityExpectation {
  showQueries: boolean;
  saveQuery: boolean;
}

export interface MatrixCase {
  label: string;
  featurePriv: FeaturePrivilege;
  sqmPriv: SqmPrivilege;
  expected: CapabilityExpectation;
}

/**
 * Capability matrix derived from `x-pack/platform/plugins/shared/features/server/oss_features.ts`.
 * v1 features inherit `saveQuery` from the feature's `all` privilege (the
 * legacy implicit derivation); v2 features require explicit
 * `savedQueryManagement` privileges.
 */
export const V1_MATRIX: MatrixCase[] = [
  {
    label: 'feature:read + sqm:all',
    featurePriv: 'read',
    sqmPriv: 'all',
    expected: { showQueries: true, saveQuery: true },
  },
  {
    label: 'feature:read + sqm:read',
    featurePriv: 'read',
    sqmPriv: 'read',
    expected: { showQueries: true, saveQuery: false },
  },
  {
    label: 'feature:read + sqm:none',
    featurePriv: 'read',
    sqmPriv: 'none',
    expected: { showQueries: true, saveQuery: false },
  },
  {
    label: 'feature:all + sqm:all',
    featurePriv: 'all',
    sqmPriv: 'all',
    expected: { showQueries: true, saveQuery: true },
  },
  {
    label: 'feature:all + sqm:read',
    featurePriv: 'all',
    sqmPriv: 'read',
    expected: { showQueries: true, saveQuery: true },
  },
  {
    label: 'feature:all + sqm:none',
    featurePriv: 'all',
    sqmPriv: 'none',
    expected: { showQueries: true, saveQuery: true },
  },
];

export const V2_MATRIX: MatrixCase[] = [
  {
    label: 'feature:read + sqm:all',
    featurePriv: 'read',
    sqmPriv: 'all',
    expected: { showQueries: true, saveQuery: true },
  },
  {
    label: 'feature:read + sqm:read',
    featurePriv: 'read',
    sqmPriv: 'read',
    expected: { showQueries: true, saveQuery: false },
  },
  {
    label: 'feature:read + sqm:none',
    featurePriv: 'read',
    sqmPriv: 'none',
    expected: { showQueries: false, saveQuery: false },
  },
  {
    label: 'feature:all + sqm:all',
    featurePriv: 'all',
    sqmPriv: 'all',
    expected: { showQueries: true, saveQuery: true },
  },
  {
    label: 'feature:all + sqm:read',
    featurePriv: 'all',
    sqmPriv: 'read',
    expected: { showQueries: true, saveQuery: false },
  },
  {
    label: 'feature:all + sqm:none',
    featurePriv: 'all',
    sqmPriv: 'none',
    expected: { showQueries: false, saveQuery: false },
  },
];

export interface CapabilitiesResponse {
  navLinks: Record<string, boolean>;
  catalogue: Record<string, boolean>;
  savedQueryManagement: {
    showQueries: boolean;
    saveQuery: boolean;
  };
}
