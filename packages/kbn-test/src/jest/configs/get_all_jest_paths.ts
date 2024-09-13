/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import minimatch from 'minimatch';
import { getRepoFiles } from '@kbn/get-repo-files';

import { testMatch } from '../../../jest-preset';

const UNIT_CONFIG_NAME = 'jest.config.js';
const INTEGRATION_CONFIG_NAME = 'jest.integration.config.js';

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

export async function getAllJestPaths() {
  const tests = new Set<string>();
  const configs = new Set<string>();

  for (const { repoRel, abs } of await getRepoFiles()) {
    switch (classify(repoRel)) {
      case 'test':
        tests.add(abs);
        break;
      case 'config':
        configs.add(abs);
        break;
    }
  }

  return {
    tests,
    configs,
  };
}
