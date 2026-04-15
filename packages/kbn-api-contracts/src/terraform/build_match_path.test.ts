/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TerraformApi } from './load_terraform_apis';
import { buildMatchPath } from './build_match_path';

describe('buildMatchPath', () => {
  it('returns undefined for an empty list', () => {
    expect(buildMatchPath([])).toBeUndefined();
  });

  it('builds a pattern from a single path', () => {
    const apis: TerraformApi[] = [
      { path: '/api/actions/connector', methods: ['GET', 'POST'], resource: 'r', owners: [] },
    ];
    expect(buildMatchPath(apis)).toBe('/api/actions/connector');
  });

  it('deduplicates paths that differ only by methods', () => {
    const apis: TerraformApi[] = [
      { path: '/api/actions/connector', methods: ['GET', 'POST'], resource: 'r', owners: [] },
      {
        path: '/api/actions/connector/{id}',
        methods: ['GET', 'PUT', 'DELETE'],
        resource: 'r',
        owners: [],
      },
    ];
    const result = buildMatchPath(apis);
    expect(result).toBe('/api/actions/connector|/api/actions/connector/[^/]+');
  });

  it('replaces path parameters with [^/]+', () => {
    const apis: TerraformApi[] = [
      { path: '/api/security/role/{name}', methods: ['GET'], resource: 'r', owners: [] },
    ];
    expect(buildMatchPath(apis)).toBe('/api/security/role/[^/]+');
  });

  it('escapes regex special characters in path segments', () => {
    const apis: TerraformApi[] = [
      { path: '/api/saved_objects/_import', methods: ['POST'], resource: 'r', owners: [] },
    ];
    expect(buildMatchPath(apis)).toBe('/api/saved_objects/_import');
  });

  it('builds the full terraform provider APIs pattern', () => {
    const apis: TerraformApi[] = [
      { path: '/api/actions/connector', methods: ['GET', 'POST'], resource: 'r1', owners: [] },
      {
        path: '/api/actions/connector/{id}',
        methods: ['GET', 'PUT', 'DELETE'],
        resource: 'r1',
        owners: [],
      },
      { path: '/api/alerting/rule', methods: ['GET', 'POST'], resource: 'r2', owners: [] },
      {
        path: '/api/alerting/rule/{id}',
        methods: ['GET', 'PUT', 'DELETE'],
        resource: 'r2',
        owners: [],
      },
    ];
    const result = buildMatchPath(apis);
    const parts = result!.split('|');
    expect(parts).toHaveLength(4);
    expect(parts).toContain('/api/actions/connector');
    expect(parts).toContain('/api/actions/connector/[^/]+');
    expect(parts).toContain('/api/alerting/rule');
    expect(parts).toContain('/api/alerting/rule/[^/]+');
  });
});
