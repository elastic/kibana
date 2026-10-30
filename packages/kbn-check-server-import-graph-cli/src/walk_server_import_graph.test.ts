/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { walkServerImportGraph, type ImportTarget } from './walk_server_import_graph';

/**
 * Builds the walk inputs from an in-memory graph. Keys are absolute paths, values are import
 * requests: relative requests resolve to source files, bare names to node modules.
 */
const graph = (files: Record<string, string[]>) => ({
  readValueImports: (path: string) => files[path] ?? [],
  resolve: (request: string, dirname: string): ImportTarget => {
    if (request.startsWith('.')) {
      const absolute = Path.resolve(dirname, request);
      return absolute in files ? { kind: 'source', absolute } : { kind: 'other' };
    }
    return { kind: 'node_module', name: request };
  },
  isBannedNodeModule: (name: string) => name === '@elastic/eui',
});

describe('walkServerImportGraph', () => {
  it('reports banned imports reachable from an entry with the shortest chain', () => {
    const result = walkServerImportGraph({
      entryPaths: ['/repo/plugin/server/index'],
      ...graph({
        '/repo/plugin/server/index': ['./routes', '../common/index'],
        '/repo/plugin/server/routes': ['../common/palette'],
        '/repo/plugin/common/index': ['./palette', './pure'],
        '/repo/plugin/common/palette': ['@elastic/eui', 'lodash'],
        '/repo/plugin/common/pure': [],
      }),
    });

    expect(result.fileCount).toBe(5);
    expect(result.violations).toEqual([
      {
        importer: '/repo/plugin/common/palette',
        nodeModule: '@elastic/eui',
        request: '@elastic/eui',
        chain: [
          '/repo/plugin/server/index',
          '/repo/plugin/server/routes',
          '/repo/plugin/common/palette',
        ],
      },
    ]);
  });

  it('does not report banned imports that are not reachable from any entry', () => {
    const result = walkServerImportGraph({
      entryPaths: ['/repo/plugin/server/index'],
      ...graph({
        '/repo/plugin/server/index': ['./pure'],
        '/repo/plugin/server/pure': [],
        '/repo/plugin/public/index': ['@elastic/eui'],
      }),
    });

    expect(result.violations).toEqual([]);
    expect(result.fileCount).toBe(2);
  });

  it('handles cycles and reports each importer/module pair once', () => {
    const result = walkServerImportGraph({
      entryPaths: ['/repo/a', '/repo/b'],
      ...graph({
        '/repo/a': ['./b', '@elastic/eui'],
        '/repo/b': ['./a', '@elastic/eui', '@elastic/eui/lib/thing'],
      }),
    });

    expect(
      result.violations.map(({ importer, nodeModule }) => `${importer} ${nodeModule}`)
    ).toEqual(['/repo/a @elastic/eui', '/repo/b @elastic/eui']);
  });

  it('does not descend into node modules or unresolved targets', () => {
    const readValueImports = jest.fn((path: string) =>
      path === '/repo/entry' ? ['lodash', './missing'] : []
    );
    const result = walkServerImportGraph({
      entryPaths: ['/repo/entry'],
      readValueImports,
      resolve: (request): ImportTarget =>
        request === 'lodash' ? { kind: 'node_module', name: 'lodash' } : { kind: 'other' },
      isBannedNodeModule: () => false,
    });

    expect(result.violations).toEqual([]);
    expect(readValueImports).toHaveBeenCalledTimes(1);
  });
});
