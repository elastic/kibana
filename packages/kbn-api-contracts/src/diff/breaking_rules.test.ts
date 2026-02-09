/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filterBreakingChanges, filterBreakingChangesWithAllowlist } from './breaking_rules';
import type { OasDiff, PathDiff, MethodDiff, OperationDiff } from './diff_oas';
import type { Allowlist } from '../allowlist/load_allowlist';

const createOasDiff = (overrides: Partial<OasDiff> = {}): OasDiff => ({
  pathsAdded: [],
  pathsRemoved: [],
  methodsAdded: [],
  methodsRemoved: [],
  operationsModified: [],
  ...overrides,
});

const removedPath = (path: string): PathDiff => ({ type: 'removed', path });

const addedPath = (path: string): PathDiff => ({ type: 'added', path });

const removedMethod = (path: string, method: string): MethodDiff => ({
  type: 'removed',
  path,
  method,
});

const addedMethod = (path: string, method: string): MethodDiff => ({
  type: 'added',
  path,
  method,
});

const operationDiff = (
  path: string,
  method: string,
  changes: OperationDiff['changes']
): OperationDiff => ({ path, method, changes });

describe('filterBreakingChanges', () => {
  it('detects removed paths as breaking', () => {
    const diff = createOasDiff({
      pathsRemoved: [removedPath('/api/test')],
    });

    const breaking = filterBreakingChanges(diff);

    expect(breaking).toEqual([
      { type: 'path_removed', path: '/api/test', reason: 'Endpoint removed' },
    ]);
  });

  it('detects removed methods as breaking', () => {
    const diff = createOasDiff({
      methodsRemoved: [removedMethod('/api/test', 'post')],
    });

    const breaking = filterBreakingChanges(diff);

    expect(breaking).toEqual([
      {
        type: 'method_removed',
        path: '/api/test',
        method: 'post',
        reason: 'HTTP method removed',
      },
    ]);
  });

  it('detects removed request body as breaking', () => {
    const diff = createOasDiff({
      operationsModified: [
        operationDiff('/api/test', 'post', [{ type: 'requestBody', change: 'removed' }]),
      ],
    });

    const breaking = filterBreakingChanges(diff);

    expect(breaking).toEqual([
      {
        type: 'operation_breaking',
        path: '/api/test',
        method: 'post',
        reason: 'requestBody removed',
        details: undefined,
      },
    ]);
  });

  it('detects modified responses as breaking', () => {
    const diff = createOasDiff({
      operationsModified: [
        operationDiff('/api/test', 'get', [
          { type: 'responses', change: 'modified', details: { '200': {} } },
        ]),
      ],
    });

    const breaking = filterBreakingChanges(diff);

    expect(breaking).toEqual([
      {
        type: 'operation_breaking',
        path: '/api/test',
        method: 'get',
        reason: 'responses modified',
        details: { '200': {} },
      },
    ]);
  });

  it('does not detect added operations as breaking', () => {
    const diff = createOasDiff({
      pathsAdded: [addedPath('/api/new')],
      methodsAdded: [addedMethod('/api/test', 'patch')],
      operationsModified: [
        operationDiff('/api/test', 'get', [{ type: 'parameters', change: 'added', details: [] }]),
      ],
    });

    const breaking = filterBreakingChanges(diff);

    expect(breaking).toEqual([]);
  });

  it('handles multiple breaking changes', () => {
    const diff = createOasDiff({
      pathsRemoved: [removedPath('/api/old')],
      methodsRemoved: [removedMethod('/api/test', 'delete')],
      operationsModified: [
        operationDiff('/api/test', 'post', [
          { type: 'requestBody', change: 'modified' },
          { type: 'responses', change: 'removed' },
        ]),
      ],
    });

    const breaking = filterBreakingChanges(diff);

    expect(breaking).toHaveLength(4);
    expect(breaking.map((b) => b.type)).toEqual([
      'path_removed',
      'method_removed',
      'operation_breaking',
      'operation_breaking',
    ]);
  });
});

describe('filterBreakingChangesWithAllowlist', () => {
  const createAllowlist = (entries: Allowlist['entries'] = []): Allowlist => ({ entries });

  it('separates allowlisted changes from breaking changes', () => {
    const diff = createOasDiff({
      pathsRemoved: [removedPath('/api/allowed'), removedPath('/api/not-allowed')],
    });

    const allowlist = createAllowlist([
      { path: '/api/allowed', method: 'ALL', reason: 'Approved', approvedBy: 'test' },
    ]);

    const result = filterBreakingChangesWithAllowlist(diff, allowlist);

    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0].path).toBe('/api/not-allowed');
    expect(result.allowlistedChanges).toHaveLength(1);
    expect(result.allowlistedChanges[0].path).toBe('/api/allowed');
  });

  it('filters allowlisted method removals by path and method', () => {
    const diff = createOasDiff({
      methodsRemoved: [removedMethod('/api/test', 'get'), removedMethod('/api/test', 'post')],
    });

    const allowlist = createAllowlist([
      { path: '/api/test', method: 'get', reason: 'Approved', approvedBy: 'test' },
    ]);

    const result = filterBreakingChangesWithAllowlist(diff, allowlist);

    expect(result.breakingChanges).toHaveLength(1);
    expect(result.breakingChanges[0].method).toBe('post');
    expect(result.allowlistedChanges).toHaveLength(1);
    expect(result.allowlistedChanges[0].method).toBe('get');
  });

  it('returns all changes as breaking when allowlist is empty', () => {
    const diff = createOasDiff({
      pathsRemoved: [removedPath('/api/test')],
    });

    const result = filterBreakingChangesWithAllowlist(diff, createAllowlist());

    expect(result.breakingChanges).toHaveLength(1);
    expect(result.allowlistedChanges).toHaveLength(0);
  });

  it('handles operation changes with method matching', () => {
    const diff = createOasDiff({
      operationsModified: [
        operationDiff('/api/test', 'post', [{ type: 'requestBody', change: 'removed' }]),
      ],
    });

    const allowlist = createAllowlist([
      { path: '/api/test', method: 'post', reason: 'Approved', approvedBy: 'test' },
    ]);

    const result = filterBreakingChangesWithAllowlist(diff, allowlist);

    expect(result.breakingChanges).toHaveLength(0);
    expect(result.allowlistedChanges).toHaveLength(1);
  });
});
