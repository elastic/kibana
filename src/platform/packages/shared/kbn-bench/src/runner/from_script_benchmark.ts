/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs/promises';
import Path from 'path';
import type { Script, ScriptBenchmark, ScriptCommand } from '../config/types';
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

async function resolveKibanaBuildDir(context: BenchmarkRunContext): Promise<string> {
  const buildDir = Path.join(context.workspace.getDir(), 'build/default');
  const entries = await Fs.readdir(buildDir, { withFileTypes: true });
  const kibanaBuildDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('kibana-'))
    .map((entry) => Path.join(buildDir, entry.name));

  if (kibanaBuildDirs.length === 0) {
    throw new Error(`No Kibana build directory found in ${buildDir}`);
  }

  if (kibanaBuildDirs.length === 1) {
    return kibanaBuildDirs[0];
  }

  const dirsWithStats = await Promise.all(
    kibanaBuildDirs.map(async (dir) => ({
      dir,
      stats: await Fs.stat(dir),
    }))
  );

  return dirsWithStats.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0].dir;
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
        kibanaBuildDir = await resolveKibanaBuildDir(context);
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
