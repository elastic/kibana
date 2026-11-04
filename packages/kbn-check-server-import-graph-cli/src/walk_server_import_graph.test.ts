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

const bannedNodeModules = new Set(['@elastic/eui']);

const getImports =
  (files: Record<string, string[]>) =>
  (file: string): ImportTarget[] =>
    (files[file] ?? []).flatMap((request): ImportTarget[] => {
      if (!request.startsWith('.')) {
        return [{ request, kind: 'node_module', name: request }];
      }
      const absolute = Path.resolve(Path.dirname(file), request);
      return absolute in files ? [{ request, kind: 'source', absolute }] : [];
    });

describe('walkServerImportGraph', () => {
  it('reports banned imports reachable from an entry with the shortest chain', () => {
    const result = walkServerImportGraph({
      entryPaths: ['/repo/plugin/server/index'],
      bannedNodeModules,
      getImports: getImports({
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
      bannedNodeModules,
      getImports: getImports({
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
      entryPaths: ['/repo/a', '/repo/b', '/repo/a'],
      bannedNodeModules,
      getImports: getImports({
        '/repo/a': ['./b', '@elastic/eui'],
        '/repo/b': ['./a', '@elastic/eui', '@elastic/eui'],
      }),
    });

    expect(result.fileCount).toBe(2);
    expect(
      result.violations.map(({ importer, nodeModule }) => `${importer} ${nodeModule}`)
    ).toEqual(['/repo/a @elastic/eui', '/repo/b @elastic/eui']);
  });

  it('does not descend into node modules', () => {
    const getImportsMock = jest.fn(getImports({ '/repo/entry': ['lodash'] }));
    const result = walkServerImportGraph({
      entryPaths: ['/repo/entry'],
      bannedNodeModules,
      getImports: getImportsMock,
    });

    expect(result.violations).toEqual([]);
    expect(getImportsMock).toHaveBeenCalledTimes(1);
  });
});
