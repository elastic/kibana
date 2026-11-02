/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import execa from 'execa';
import inquirer from 'inquirer';
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
  const remedy = result.fix?.command ?? result.hint;
  const message = remedy ? `${result.message}${chalk.dim(` → ${remedy}`)}` : result.message;

  // listr2 has no warning state, so warnings are rendered as skipped tasks with a ⚠ icon
  if (result.status === 'warn') {
    task.skip(message);
  } else if (result.status === 'fail') {
    task.title = message;
    throw new Error(result.message);
  } else {
    task.title = message;
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

const runChecks = async (log: ToolingLog, arch?: DoctorArch): Promise<CheckResult[]> => {
  const startTime = Date.now();
  const results: CheckResult[] = [];

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
  const warnings = count('warn');
  const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
  log.write(
    `\n ${chalk.red(`${count('fail')} failed`)} · ${chalk.yellow(
      `${warnings} warning${warnings === 1 ? '' : 's'}`
    )} · ${chalk.green(`${count('pass')} passed`)}  ${chalk.dim(`(${seconds}s)`)}`
  );

  return results;
};

const confirm = async (result: CheckResult) => {
  // destructive fixes need someone to say yes
  if (!process.stdin.isTTY) {
    return false;
  }

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>({
    type: 'confirm',
    name: 'confirmed',
    default: false,
    message: `${result.message}${result.hint ? ` (${result.hint})` : ''}\n  Run ${chalk.cyan(
      result.fix?.command
    )}?`,
  });
  return confirmed;
};

const applyFixes = async (log: ToolingLog, results: CheckResult[]) => {
  for (const result of results) {
    const { fix } = result;
    if (!fix || (fix.destructive && !(await confirm(result)))) {
      continue;
    }

    log.write(`\n ${chalk.cyan('▶')} ${fix.command}`);
    try {
      await (fix.run ? fix.run() : execa.command(fix.command, { stdio: 'inherit' }));
    } catch (error) {
      log.write(chalk.red(` ✖ ${error.message}`));
    }
  }
};

const printFixCommands = (log: ToolingLog, results: CheckResult[]) => {
  const commands = results.flatMap(({ fix }) => (fix ? [fix.command] : []));
  if (!commands.length) {
    return;
  }

  log.write(`\n To fix, run:`);
  commands.forEach((command) => log.write(`   ${chalk.cyan(command)}`));
  log.write(chalk.dim(`\n Or let doctor run them: node scripts/scout doctor --fix`));
};

export const runDoctor = async (
  log: ToolingLog,
  { arch, fix }: { arch?: DoctorArch; fix: boolean }
) => {
  const target = `local · ${arch ?? 'stateful + serverless'}`;
  log.write(`\n ${chalk.bold.inverse(' Scout doctor ')}  ${target}\n`);

  let results = await runChecks(log, arch);
  if (fix && results.some((result) => result.fix)) {
    await applyFixes(log, results);
    log.write(`\n ${chalk.bold('Checking again')}\n`);
    results = await runChecks(log, arch);
  }
  if (!fix) {
    printFixCommands(log, results);
  }

  const ready = !results.some(({ status }) => status === 'fail');
  log.write(
    ready
      ? chalk.green.bold(`\n ✔ Ready to run Scout (${target})\n`)
      : chalk.red.bold(`\n ✖ Not ready to run Scout (${target})\n`)
  );
  return ready;
};
