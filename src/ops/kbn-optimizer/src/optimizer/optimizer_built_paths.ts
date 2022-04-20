/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import globby from 'globby';

import { ascending } from '../common';

export async function getOptimizerBuiltPaths() {
  return (
    await globby(
      ['**/*', '!**/{__fixtures__,__snapshots__,integration_tests,babel_runtime_helpers,node}/**'],
      {
        cwd: Path.resolve(__dirname, '../'),
        absolute: true,
      }
    )
  )
    .slice()
    .sort(ascending((p) => p));
}
