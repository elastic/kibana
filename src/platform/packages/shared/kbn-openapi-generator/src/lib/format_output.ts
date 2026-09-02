/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative } from 'path';
import { runOxfmt } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Formats the given file or glob in place. oxfmt only expands globs relative to its cwd, so the
 * path is made relative to the repo root first.
 */
export async function formatOutput(path: string) {
  await runOxfmt([relative(REPO_ROOT, path)]);
}
