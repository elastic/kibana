/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import type {
  ListrDefaultRenderer,
  ListrSimpleRenderer,
  ListrTask,
  ListrTaskWrapper,
} from 'listr2';
import { Listr, ListrDefaultRendererLogLevels } from 'listr2';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CheckResult, DoctorCheck, DoctorCheckGroup } from './types';
import { fail } from './types';
import { environmentChecks } from './checks/environment';
import { playwrightChecks } from './checks/playwright';
import { localServerChecks } from './checks/local_servers';
import { esSnapshotChecks } from './checks/es_snapshot';
import { dockerChecks } from './checks/docker';

export type DoctorArch = 'stateful' | 'serverless';

const runCheck = async (
  check: DoctorCheck,
  task: ListrTaskWrapper<unknown, ListrDefaultRenderer, ListrSimpleRenderer>,
  results: CheckResult[]
) => {
  const result = await check.run().catch((error: Error) => fail(error.message));
  results.push(result);
  const hint = result.hint ? chalk.dim(` → ${result.hint}`) : '';

  // listr2 has no warning state, so warnings are rendered as skipped tasks with a ⚠ icon
  if (result.status === 'warn') {
    task.skip(`${result.message}${hint}`);
  } else if (result.status === 'fail') {
    task.title = `${result.message}${hint}`;
    throw new Error(result.message);
  } else {
    task.title = result.message;
  }
};

const toListrTasks = (
  { checks, stopOnFailure }: DoctorCheckGroup,
  results: CheckResult[]
): ListrTask[] => {
  let failed = false;

  return checks.map((check) => ({
    title: check.title,
    // e.g. image checks are hidden when Docker is not running
    enabled: () => !failed,
    task: async (_, task) => {
      try {
        await runCheck(check, task, results);
      } catch (error) {
        failed = Boolean(stopOnFailure);
        throw error;
      }
    },
  }));
};

const getGroups = (arch?: DoctorArch): DoctorCheckGroup[] => [
  environmentChecks,
  playwrightChecks,
  localServerChecks,
  ...(arch !== 'serverless' ? [esSnapshotChecks] : []),
  ...(arch !== 'stateful' ? [dockerChecks] : []),
];

export const runDoctor = async (log: ToolingLog, arch?: DoctorArch) => {
  const startTime = Date.now();
  const results: CheckResult[] = [];
  const target = `local · ${arch ?? 'stateful + serverless'}`;

  log.write(`\n ${chalk.bold.inverse(' Scout doctor ')}  ${target}\n`);

  await new Listr(
    getGroups(arch).map((group) => ({
      title: group.title,
      task: (_, task) =>
        task.newListr(toListrTasks(group, results), {
          concurrent: !group.stopOnFailure,
          exitOnError: false,
        }),
    })),
    {
      concurrent: true,
      exitOnError: false,
      fallbackRenderer: 'simple',
      rendererOptions: {
        collapseSubtasks: false,
        collapseSkips: true,
        suffixSkips: false,
        collapseErrors: false,
        showErrorMessage: false,
        icon: {
          [ListrDefaultRendererLogLevels.SKIPPED_WITH_COLLAPSE]: '⚠',
          [ListrDefaultRendererLogLevels.COMPLETED_WITH_FAILED_SUBTASKS]: '✖',
        },
        color: {
          [ListrDefaultRendererLogLevels.COMPLETED_WITH_FAILED_SUBTASKS]: chalk.red,
        },
      },
    }
  ).run();

  const count = (status: CheckResult['status']) =>
    results.filter((result) => result.status === status).length;
  const [failed, warnings, passed] = [count('fail'), count('warn'), count('pass')];
  const seconds = ((Date.now() - startTime) / 1000).toFixed(1);

  log.write(
    `\n ${chalk.red(`${failed} failed`)} · ${chalk.yellow(`${warnings} warnings`)} · ${chalk.green(
      `${passed} passed`
    )}  ${chalk.dim(`(${seconds}s)`)}`
  );
  log.write(
    failed
      ? chalk.red.bold(` ✖ Not ready to run Scout (${target}), fix the failed checks above\n`)
      : chalk.green.bold(` ✔ Ready to run Scout (${target})\n`)
  );

  return failed === 0;
};
