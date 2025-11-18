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

function createBenchmark(name: string, config: string, shards: number) {
  return {
    kind: 'script' as const,
    name,
    beforeAll: `node scripts/jest --clearCache --config ${config} && node scripts/jest --config ${config} --runInBand --shard=1/${shards}`,
    run: `node scripts/jest --config ${config} --runInBand --shard=1/${shards}`,
    compare: {
      exists: 'lhs' as const,
      missing: 'lhs' as const,
    },
    ensure: {
      bootstrap: true,
    },
  } satisfies ScriptBenchmark;
}

const config: InitialBenchConfig = {
  name: 'jest',
  benchmarks: [
    createBenchmark('cases-partial', 'x-pack/platform/plugins/shared/cases/jest.config.js', 32),
    createBenchmark(
      'security-lib-partial',
      'x-pack/solutions/security/plugins/security_solution/server/lib/jest.config.js',
      16
    ),
    createBenchmark(
      'alerting-plugin-test',
      'x-pack/platform/plugins/shared/alerting/jest.config.js --testPathPattern x-pack/platform/plugins/shared/alerting/server/plugin.test.ts',
      1
    ),
    createBenchmark('streams-full', 'x-pack/platform/plugins/shared/streams/jest.config.js', 1),
  ],
  runs: 5,
  timeout: 10 * 300_000,
};

// eslint-disable-next-line import/no-default-export
export default config;
