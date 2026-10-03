/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MultiCompiler, MultiStats } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import { createSharedCompileConfigs } from './config/create_multi_compile_config';
import { rspack } from './rspack_runtime';

export interface SharedBuildResult {
  success: boolean;
  errors?: string[];
  close?: () => Promise<void>;
  done?: Promise<void>;
}

export async function runSharedBuild({
  repoRoot,
  outputRoot = repoRoot,
  dist = false,
  watch = false,
  log,
}: {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
  watch?: boolean;
  log?: ToolingLog;
}): Promise<SharedBuildResult> {
  const compiler = rspack(
    createSharedCompileConfigs({ repoRoot, outputRoot, dist })
  ) as MultiCompiler;

  if (watch) {
    return runSharedWatch(compiler, log);
  }
  return runSharedOnce(compiler, log);
}

async function runSharedOnce(
  compiler: MultiCompiler,
  log?: ToolingLog
): Promise<SharedBuildResult> {
  return new Promise((resolve) => {
    compiler.run((error, stats) => {
      const result = getSharedResult(error, stats, log);
      compiler.close(() => resolve(result));
    });
  });
}

async function runSharedWatch(
  compiler: MultiCompiler,
  log?: ToolingLog
): Promise<SharedBuildResult> {
  return new Promise((resolve) => {
    let initialBuild = true;
    let resolveDone: () => void;
    let closing: Promise<void> | undefined;
    const done = new Promise<void>((doneResolve) => {
      resolveDone = doneResolve;
    });
    const close = () => {
      closing ??= new Promise<void>((closeResolve) => {
        watching.close(() => {
          resolveDone();
          closeResolve();
        });
      });
      return closing;
    };
    const watching = compiler.watch(
      compiler.compilers.map(({ options }) => options.watchOptions ?? {}),
      (error, stats) => {
        const result = getSharedResult(error, stats, log);
        if (initialBuild) {
          initialBuild = false;
          resolve({
            ...result,
            close,
            done,
          });
        }
      }
    );
  });
}

function getSharedResult(
  error: Error | null,
  stats: MultiStats | undefined,
  log?: ToolingLog
): SharedBuildResult {
  if (error) {
    log?.error(error.message);
    return { success: false, errors: [error.message] };
  }
  if (!stats) {
    return { success: false, errors: ['No shared build stats returned'] };
  }

  if (stats.hasErrors()) {
    const errors = stats.stats.flatMap((child) => {
      const compilerName = child.compilation.name ?? 'unknown';
      return (child.toJson({ all: false, errors: true }).errors ?? []).map(
        ({ message }) => `[${compilerName}] ${message}`
      );
    });
    for (const message of errors) {
      log?.error(message);
    }
    return { success: false, errors };
  }

  log?.success('Shared frontend bundles built with Rspack.');
  return { success: true };
}
