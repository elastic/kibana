/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Listr, type ListrTask } from 'listr2';
import chalk from 'chalk';
import type { CheckToRun, CheckResult, QuickChecksContext } from '../types';
import { MAX_PARALLELISM } from '../config';
import { humanizeTime, getScriptShortName } from '../utils';
import { getCommandForCheck } from '../checks/command';
import { runCheckAsync } from './runner';

interface ListrContext {
  results: CheckResult[];
}

/**
 * Execute checks locally - Listr-based with interactive display
 * In fix mode, file-changing checks run sequentially first
 */
export async function executeChecksLocally(
  checks: CheckToRun[],
  context: QuickChecksContext
): Promise<CheckResult[]> {
  const { fixMode } = context;

  if (fixMode) {
    const fileChangingChecks = checks.filter((check) => check.mayChangeFiles);
    const regularChecks = checks.filter((check) => !check.mayChangeFiles);

    // Run file-changing checks sequentially, then regular checks in parallel
    const seqResults = await runChecksSequentially(fileChangingChecks, context);
    const parallelResults = await runChecksInParallel(regularChecks, context);

    return [...seqResults, ...parallelResults];
  }

  return runChecksInParallel(checks, context);
}

/**
 * Run checks sequentially using Listr
 */
async function runChecksSequentially(
  checks: CheckToRun[],
  context: QuickChecksContext
): Promise<CheckResult[]> {
  if (checks.length === 0) {
    return [];
  }

  const listrContext: ListrContext = { results: [] };

  const tasks: ListrTask<ListrContext>[] = checks.map((check, idx) =>
    createListrTask(check, `seq [${idx + 1}/${checks.length}]`, context)
  );

  const list = new Listr<ListrContext>(tasks, {
    concurrent: false,
    exitOnError: false,
    renderer: (context.showCommands ? 'simple' : 'default') as any,
    rendererOptions: {
      collapseSubtasks: false,
      collapseErrors: false,
    },
  });

  try {
    await list.run(listrContext);
  } catch {
    // Errors are tracked in results
  }

  return listrContext.results;
}

/**
 * Run checks in parallel using Listr
 */
async function runChecksInParallel(
  checks: CheckToRun[],
  context: QuickChecksContext
): Promise<CheckResult[]> {
  if (checks.length === 0) {
    return [];
  }

  const listrContext: ListrContext = { results: [] };

  const tasks: ListrTask<ListrContext>[] = checks.map((check, idx) =>
    createListrTask(check, `[${idx + 1}/${checks.length}]`, context)
  );

  const list = new Listr<ListrContext>(tasks, {
    concurrent: MAX_PARALLELISM,
    exitOnError: false,
    renderer: (context.showCommands ? 'simple' : 'default') as any,
    rendererOptions: {
      collapseSubtasks: false,
      collapseErrors: false,
    },
  });

  try {
    await list.run(listrContext);
  } catch {
    // Errors are tracked in results
  }

  return listrContext.results;
}

/**
 * Create a Listr task for a single check
 */
function createListrTask(
  check: CheckToRun,
  label: string,
  context: QuickChecksContext
): ListrTask<ListrContext> {
  const scriptName = getScriptShortName(check.script);
  const command = getCommandForCheck(check, context);
  const commandSuffix = context.showCommands ? `\n${chalk.dim(`$ ${command}`)}` : '';

  return {
    title: `${label} ${scriptName}${commandSuffix}`,
    task: async (ctx, task) => {
      const result = await runCheckAsync(check, command, context);
      ctx.results.push(result);

      const time = humanizeTime(result.durationMs);

      if (result.success) {
        task.title = `${label} ${scriptName} (${time})${commandSuffix}`;
      } else {
        throw new Error(`${scriptName} failed (${time})${commandSuffix}`);
      }
    },
  };
}
