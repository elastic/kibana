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
  return {
    kind: 'script' as const,
    name,
    beforeAll: `node scripts/build_kibana_platform_plugins --no-cache`,
    run: `node scripts/functional_tests --config ${config}`,
    compare: {
      exists: 'lhs' as const,
      missing: 'lhs' as const,
    },
    ensure: {
      bootstrap: true,
      build: true,
    },
  } satisfies ScriptBenchmark;
}

const config: InitialBenchConfig = {
  name: 'ftr',
  benchmarks: [
    createBenchmark('discover', 'src/platform/test/functional/apps/discover/group1/config.ts'),
    createBenchmark('security-saml', 'x-pack/platform/test/security_functional/saml.config.ts'),
  ],
  runs: 1,
  timeout: 10 * 300_000,
};

// eslint-disable-next-line import/no-default-export
export default config;
