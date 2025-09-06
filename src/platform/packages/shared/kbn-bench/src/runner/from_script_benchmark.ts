/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import type { Script, ScriptBenchmark } from '../config/types';
import type { BenchmarkRunContext, BenchmarkRunnable } from './types';

function scriptToRunnableMethod<T extends Script | undefined>(
  script?: T
): T extends undefined ? undefined : (context: BenchmarkRunContext) => Promise<void>;

function scriptToRunnableMethod(script?: Script) {
  if (!script) {
    return script;
  }

  const [cmd, args, cwd] =
    typeof script === 'string' ? [script, [], undefined] : [script.cmd, script.args, script.cwd];

  return async (context: BenchmarkRunContext) => {
    await execa(cmd, args, {
      cwd: cwd ?? context.workspace.getDir(),
    });
  };
}

export function fromScriptBenchmark(benchmark: ScriptBenchmark): BenchmarkRunnable {
  return {
    run: scriptToRunnableMethod(benchmark.run),
    beforeAll: scriptToRunnableMethod(benchmark.beforeAll),
    afterAll: scriptToRunnableMethod(benchmark.afterAll),
    before: scriptToRunnableMethod(benchmark.before),
    after: scriptToRunnableMethod(benchmark.after),
  };
}
