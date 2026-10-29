/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';

import { REPO_ROOT } from '@kbn/repo-info';

/** Runs every Jest config in the current affected Moon project. */
export const runMoonJestProject = (): void => {
  const args = process.argv.slice(2);
  const separator = args.indexOf('--');
  if (separator < 0) throw new Error('Moon Jest arguments must separate configs with --');
  const configs = args.slice(0, separator);
  const jestArgs = args.slice(separator + 1);

  for (const config of configs) {
    const result = spawnSync(
      process.execPath,
      ['scripts/jest.js', '--passWithNoTests', '--config', config, ...jestArgs],
      { cwd: REPO_ROOT, stdio: 'inherit', env: process.env }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  }
};
