/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { MONACO_WORKER_ENTRIES } from '@kbn/monaco/server';
import { createMonacoWorkersConfig } from './create_monaco_workers_config';
import { resolveSharedAssetPaths } from './shared_asset_paths';

describe('createMonacoWorkersConfig', () => {
  it('builds the workers declared by @kbn/monaco', () => {
    const { monacoPackageRoot } = resolveSharedAssetPaths(REPO_ROOT);
    const { entry } = createMonacoWorkersConfig({ repoRoot: REPO_ROOT });
    if (
      entry == null ||
      typeof entry === 'function' ||
      typeof entry === 'string' ||
      Array.isArray(entry)
    ) {
      throw new Error('expected a worker entry map');
    }

    expect(Object.keys(entry)).toEqual(Object.keys(MONACO_WORKER_ENTRIES));
    for (const [workerId, request] of Object.entries(MONACO_WORKER_ENTRIES)) {
      const expected = request.startsWith('src/')
        ? Path.resolve(monacoPackageRoot, request)
        : request;
      expect(entry[workerId]).toBe(expected);
    }
  });
});
