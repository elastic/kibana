/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname, join } from 'path';

import execa from 'execa';
import { bin } from 'oxfmt/package.json';
import { REPO_ROOT } from '@kbn/repo-info';

export const OXFMT_BIN_PATH = join(dirname(require.resolve('oxfmt/package.json')), bin.oxfmt);
export const OXFMT_CONFIG_PATH = join(REPO_ROOT, '.oxfmtrc.json');

const OXFMT_ARGS = [OXFMT_BIN_PATH, '--config', OXFMT_CONFIG_PATH];

/**
 * Formats files or globs (relative to the repo root) in place with the repo's oxfmt config.
 */
export async function runOxfmt(paths: string[]): Promise<void> {
  await execa(process.execPath, [...OXFMT_ARGS, ...paths], { cwd: REPO_ROOT });
}

/**
 * Formats `source` with the repo's oxfmt config as if it lived at `filePath` (relative to the repo
 * root). The path picks the parser and decides whether `.oxfmtrc.json` ignores the file, in which
 * case `source` is returned unchanged.
 */
export async function formatWithOxfmt(filePath: string, source: string): Promise<string> {
  const { stdout } = await execa(
    process.execPath,
    [...OXFMT_ARGS, `--stdin-filepath=${filePath}`],
    { cwd: REPO_ROOT, input: source, stripFinalNewline: false }
  );
  return stdout;
}
