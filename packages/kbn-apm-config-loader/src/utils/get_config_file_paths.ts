/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
// deep import to avoid loading the whole package
import { getConfigPath } from '@kbn/utils/target/path';
import { getArgValues } from './read_argv';

/**
 * Return the configuration files that needs to be loaded.
 *
 * This mimics the behavior of the `src/cli/serve/serve.js` cli script by reading
 * `-c` and `--config` options from process.argv, and fallbacks to `@kbn/utils`'s `getConfigPath()`
 */
export const getConfigurationFilePaths = (argv: string[]): string[] => {
  const rawPaths = getArgValues(argv, ['-c', '--config']);
  if (rawPaths.length) {
    return rawPaths.map((path) => resolve(process.cwd(), path));
  }
  return [getConfigPath()];
};
