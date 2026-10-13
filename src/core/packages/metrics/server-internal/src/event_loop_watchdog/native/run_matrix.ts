/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const output = resolve(process.argv[2]);
const modes = ['none', 'metadata', 'inspector', 'native', 'native-lazy', 'native-early'];
const repeats = Number(process.env.BENCH_REPEATS ?? 5);
for (let repetition = 0; repetition < repeats; repetition++) {
  // Rotate and reverse to avoid always warming the machine in the same order.
  const order = modes
    .slice(repetition % modes.length)
    .concat(modes.slice(0, repetition % modes.length));
  if (repetition % 2) order.reverse();
  for (const mode of order) {
    const before = Date.now();
    const child = spawnSync(
      process.execPath,
      [
        '-r',
        '@kbn/setup-node-env',
        '-e',
        "require('./src/core/packages/metrics/server-internal/src/event_loop_watchdog/native/benchmark.ts')",
        mode,
      ],
      { encoding: 'utf8', timeout: 45000, env: process.env, maxBuffer: 8 * 1024 * 1024 }
    );
    assert.equal(child.status, 0, child.stderr);
    const row = JSON.parse(child.stdout.trim());
    appendFileSync(
      output,
      JSON.stringify({ repetition, recordedAt: new Date().toISOString(), ...row }) + '\n'
    );
    process.stderr.write(mode + ' ' + repetition + ' ' + (Date.now() - before) + '\n');
  }
}
