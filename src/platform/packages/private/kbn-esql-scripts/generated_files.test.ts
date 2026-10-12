/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { GENERATED_DEFINITIONS_DIR } from './definitions/constants';
import { OUTPUT_DIR as GENERATED_DOCS_DIR } from './documentation/constants';
import type { GeneratedFile } from './lib/generated_file';
import { renderGeneratedFiles } from './generated_files';

const RENDER_TIMEOUT_MS = 60_000;

const toRepoPath = (path: string) => relative(REPO_ROOT, path);

const listFiles = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((entry) => join(dir, entry))
    .filter((path) => statSync(path).isFile());

// When these fail, run `pnpm generate` in src/platform/packages/private/kbn-esql-scripts and commit the result
describe('ES|QL generated definitions and docs', () => {
  let renderedFiles: GeneratedFile[] = [];

  beforeAll(async () => {
    renderedFiles = await renderGeneratedFiles();
  }, RENDER_TIMEOUT_MS);

  it('are in sync with @elastic/esql-definitions and the generators', () => {
    const outOfSync = renderedFiles
      .filter(({ path, content }) => !existsSync(path) || readFileSync(path, 'utf8') !== content)
      .map(({ path }) => toRepoPath(path));

    expect(outOfSync).toEqual([]);
  });

  it('leave no stale files in the output directories', () => {
    const renderedPaths = new Set(renderedFiles.map(({ path }) => path));
    const staleFiles = [GENERATED_DEFINITIONS_DIR, GENERATED_DOCS_DIR]
      .flatMap(listFiles)
      .filter((path) => !renderedPaths.has(path))
      .map(toRepoPath);

    expect(staleFiles).toEqual([]);
  });
});
