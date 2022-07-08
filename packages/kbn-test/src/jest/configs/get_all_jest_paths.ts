/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import execa from 'execa';
import minimatch from 'minimatch';
import { REPO_ROOT } from '@kbn/utils';

// @ts-expect-error jest-preset is necessarily a JS file
import { testMatch } from '../../../jest-preset';

const UNIT_CONFIG_NAME = 'jest.config.js';
const INTEGRATION_CONFIG_NAME = 'jest.integration.config.js';

export async function getAllJestPaths() {
  const proc = await execa('git', ['ls-files', '-comt', '--exclude-standard'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    buffer: true,
  });

  const testsRe = (testMatch as string[]).map((p) => minimatch.makeRe(p));
  const classify = (rel: string) => {
    if (testsRe.some((re) => re.test(rel))) {
      return 'test' as const;
    }

    const basename = Path.basename(rel);
    return basename === UNIT_CONFIG_NAME || basename === INTEGRATION_CONFIG_NAME
      ? ('config' as const)
      : undefined;
  };

  const tests = new Set<string>();
  const configs = new Set<string>();

  for (const line of proc.stdout.split('\n').map((l) => l.trim())) {
    if (!line) {
      continue;
    }

    const rel = line.slice(2); // trim the single char status from the line
    const type = classify(rel);

    if (!type) {
      continue;
    }

    const set = type === 'test' ? tests : configs;
    const abs = Path.resolve(REPO_ROOT, rel);

    if (line.startsWith('C ')) {
      // this line indicates that the previous path is changed in the working tree, so we need to determine if
      // it was deleted, and if so, remove it from the set we added it to
      if (!Fs.existsSync(abs)) {
        set.delete(abs);
      }
    } else {
      set.add(abs);
    }
  }

  return {
    tests,
    configs,
  };
}
