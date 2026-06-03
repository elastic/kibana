/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InitialBenchConfig } from '@kbn/bench';
import type { ScriptBenchmark } from '@kbn/bench';

function createBenchmark(name: string, config: string) {
  let runEnv = '';
  if (!process.env.CI) {
    runEnv = 'CI=true NODE_OPTIONS=--no-deprecation '; // just for local runs
  }
  return {
    kind: 'script' as const,
    name,
    run: ({ kibanaBuildDir }) =>
      `${runEnv} node scripts/functional_tests --config ${config} --kibana-install-dir "${kibanaBuildDir}"`,
    compare: {
      exists: 'lhs' as const,
      missing: 'lhs' as const,
    },
    ensure: {
      // We want each workspace to use it's own build rather than the dist from the build itself (like normal FTR does)
      build: true,
      browser: true,
    },
  } satisfies ScriptBenchmark;
}

const config: InitialBenchConfig = {
  name: 'ftr',
  benchmarks: [
    createBenchmark('discover', 'src/platform/test/functional/apps/discover/group8/config.ts'),
    createBenchmark(
      'security-saml',
      'x-pack/solutions/security/test/cloud_security_posture_functional/config.agentless.ts'
    ),
    createBenchmark(
      'lens',
      'x-pack/platform/test/functional/apps/lens/open_in_lens/dashboard/config.ts'
    ),
  ],
  runs: 1,
  timeout: 10 * 300_000,
};

// eslint-disable-next-line import/no-default-export
export default config;
