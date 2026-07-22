/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Script, ScriptBenchmark, ScriptCommand } from '../config/types';
import { getKibanaBuildDir } from '../filesystem/get_kibana_build_dir';
import type { BenchmarkRunContext, BenchmarkRunnable } from './types';

const ENSURE_CHROME_FOR_TESTING_SCRIPT = `${__dirname}/scripts/ensure_chrome_for_testing.js`;

function scriptToRunnableMethod<T extends Script | undefined>(
  script: T,
  getEnv?: () => Record<string, string> | undefined,
  getBuildDir?: () => string | undefined
): T extends Script ? (context: BenchmarkRunContext) => Promise<void> : undefined;

function scriptToRunnableMethod(
  script?: Script,
  getEnv?: () => Record<string, string> | undefined,
  getBuildDir?: () => string | undefined
) {
  if (!script) {
    return script;
  }

  return async (context: BenchmarkRunContext) => {
    const cwd = context.workspace.getDir();
    const env = getEnv?.();
    const resolvedScript = resolveScript(script, getBuildDir?.());

    if (typeof resolvedScript === 'string') {
      await context.workspace.exec(resolvedScript, { env, log: context.log });
      return;
    }

    await context.workspace.exec(resolvedScript.cmd, resolvedScript.args ?? [], {
      cwd: resolvedScript.cwd ?? cwd,
      env,
      log: context.log,
    });
  };
}

function resolveScript(script: Script, kibanaBuildDir?: string): string | ScriptCommand {
  if (typeof script !== 'function') {
    return script;
  }

  if (!kibanaBuildDir) {
    throw new Error('Script factory requires ensure.build to resolve the Kibana build directory');
  }

  return script({ kibanaBuildDir });
}

async function ensureBrowser(context: BenchmarkRunContext): Promise<Record<string, string>> {
  if (process.env.TEST_BROWSER_BINARY_PATH) {
    return { TEST_BROWSER_BINARY_PATH: process.env.TEST_BROWSER_BINARY_PATH };
  }

  const { stdout } = await context.workspace.exec('node', [ENSURE_CHROME_FOR_TESTING_SCRIPT], {
    log: context.log,
  });

  return { TEST_BROWSER_BINARY_PATH: stdout.trim() };
}

export function fromScriptBenchmark(benchmark: ScriptBenchmark): BenchmarkRunnable {
  let env: Record<string, string> | undefined;
  let kibanaBuildDir: string | undefined;
  const getEnv = () => env;
  const getBuildDir = () => kibanaBuildDir;
  const beforeAll = scriptToRunnableMethod(benchmark.beforeAll, getEnv, getBuildDir);

  return {
    run: scriptToRunnableMethod(benchmark.run, getEnv, getBuildDir),
    beforeAll: async (context: BenchmarkRunContext) => {
      if (benchmark.ensure?.bootstrap) {
        await context.workspace.ensureBootstrap();
      }
      if (benchmark.ensure?.build) {
        await context.workspace.ensureBuild();
        const buildRootDir = Path.join(context.workspace.getDir(), 'build/default');
        kibanaBuildDir = await getKibanaBuildDir(buildRootDir);
      }
      if (benchmark.ensure?.browser && !process.env.CI) {
        env = {
          ...env,
          ...(await ensureBrowser(context)),
        };
      }
      await beforeAll?.(context);
    },
    afterAll: scriptToRunnableMethod(benchmark.afterAll, getEnv, getBuildDir),
    before: scriptToRunnableMethod(benchmark.before, getEnv, getBuildDir),
    after: scriptToRunnableMethod(benchmark.after, getEnv, getBuildDir),
  };
}
