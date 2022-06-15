/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import execa from 'execa';
import minimatch from 'minimatch';
import { REPO_ROOT } from '@kbn/utils';

// @ts-expect-error jest-preset is necessarily a JS file
import { testMatch } from '../../../jest-preset';

export async function getAllTestFiles() {
  const proc = await execa('git', ['ls-files', '-co', '--exclude-standard'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    buffer: true,
  });

  const patterns: RegExp[] = testMatch.map((p: string) => minimatch.makeRe(p));

  return proc.stdout
    .split('\n')
    .flatMap((l) => l.trim() || [])
    .filter((l) => patterns.some((p) => p.test(l)))
    .map((p) => Path.resolve(REPO_ROOT, p));
}
