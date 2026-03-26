/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InitialBenchConfig } from '../src/config/types';

/**
 * Example benchmark configuration demonstrating two kinds of benchmarks:
 * 1. A module benchmark that performs some synchronous CPU work in-process
 * 2. A script benchmark that shells out to a separate Node.js process
 */
const config: InitialBenchConfig = {
  runs: 2,
  name: 'example',
  benchmarks: [
    {
      kind: 'module',
      name: 'cpu.primes-inline',
      description: 'Compute a list of prime numbers (in-process module benchmark)',
      module: require.resolve('./primes_benchmark'),
      compare: {
        missing: 'skip',
      },
    },
    {
      kind: 'script',
      name: 'cpu.worker-script',
      description: 'Spawn a child Node.js process that performs CPU work',
      run: {
        cmd: 'node',
        args: [require.resolve('./worker_script')],
      },
      compare: {
        missing: 'skip',
      },
    },
  ],
};
// eslint-disable-next-line import/no-default-export
export default config;
