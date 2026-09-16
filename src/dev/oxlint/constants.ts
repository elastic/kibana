/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join, dirname } from 'path';
import { bin } from 'oxlint/package.json';

export const LINT_LABEL = 'oxlint';
export const LINT_LOG_PREFIX = `[${LINT_LABEL}]`;
export const OXLINT_CONFIG_PATH = '.oxlintrc.json';

/** Mirrors `LINTABLE_EXTENSIONS` in `packages/kbn-lint-cli/run_lint_cli.ts`. */
export const LINTABLE_EXTENSIONS: Record<string, true> = {
  '.ts': true,
  '.tsx': true,
  '.js': true,
  '.jsx': true,
  '.cjs': true,
  '.mjs': true,
  '.cts': true,
  '.mts': true,
};

export const oxlintBinPath = join(dirname(require.resolve('oxlint/package.json')), bin.oxlint);
