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
import { testTargets } from '@kbn/scout-info';
import type { CheckResult, DoctorCheck, DoctorCheckGroup, Fix } from './types';
import { fail } from './types';
import { environmentChecks } from './checks/environment';
import { playwrightChecks } from './checks/playwright';
import { localServerChecks } from './checks/local_servers';
import { esSnapshotChecks } from './checks/es_snapshot';
import { dockerChecks } from './checks/docker';

export type DoctorArch = 'stateful' | 'serverless';

interface ReportedResult extends CheckResult {
  group: DoctorCheckGroup;
}

const runCheck = async (
  check: DoctorCheck,
  task: ListrTaskWrapper<unknown, ListrDefaultRenderer, ListrSimpleRenderer>,
  group: DoctorCheckGroup,
  results: ReportedResult[]
) => {
  const result = await check.run().catch((error: Error) => fail(error.message));
  results.push({ ...result, group });
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

const toListrTasks = (group: DoctorCheckGroup, results: ReportedResult[]): ListrTask[] => {
  let failed = false;

  return group.checks.map((check) => ({
    title: check.title,
    // e.g. image checks are hidden when Docker is not running
    enabled: () => !failed,
    task: async (_, task) => {
      try {
        await runCheck(check, task, group, results);
      } catch (error) {
        failed = Boolean(group.stopOnFailure);
        throw error;
      }
    },
  }));
};

const ARCHS: DoctorArch[] = ['stateful', 'serverless'];

const getGroups = (arch?: DoctorArch): DoctorCheckGroup[] => [
  environmentChecks,
  playwrightChecks,
  localServerChecks,
  ...(arch !== 'serverless' ? [esSnapshotChecks] : []),
  ...(arch !== 'stateful' ? [dockerChecks] : []),
];

const runChecks = async (log: ToolingLog, arch?: DoctorArch): Promise<ReportedResult[]> => {
  const startTime = Date.now();
  const results: ReportedResult[] = [];

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

const getFixes = (results: CheckResult[]): Array<Fix & { hint?: string }> => [
  // several checks can suggest the same command, e.g. stopping running Scout servers
  ...new Map(
    results.flatMap(({ fix, hint }) => (fix ? [[fix.command, { ...fix, hint }] as const] : []))
  ).values(),
];

const confirm = async (count: number) => {
  // destructive fixes need someone to say yes
  if (!process.stdin.isTTY) {
    return false;
  }

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>({
    type: 'confirm',
    name: 'confirmed',
    default: false,
    message: `Run ${count === 1 ? 'this command' : `these ${count} commands`}?`,
  });
  return confirmed;
};

const applyFixes = async (log: ToolingLog, results: CheckResult[]) => {
  const fixes = getFixes(results);
  const hasDestructive = fixes.some(({ destructive }) => destructive);

  log.write(`\n Doctor will run:`);
  fixes.forEach(({ command, destructive, hint }) =>
    log.write(
      `   ${chalk.cyan(command)}${
        destructive ? chalk.yellow(`  ${hint ?? 'deletes files or stops processes'}`) : ''
      }`
    )
  );
  log.write('');

  const approved = !hasDestructive || (await confirm(fixes.length));
  if (!approved) {
    log.write(chalk.dim(' Skipping commands that delete files or stop processes'));
  }

  for (const { command, destructive, run } of fixes) {
    if (destructive && !approved) {
      continue;
    }

    log.write(`\n ${chalk.cyan('▶')} ${command}`);
    try {
      await (run ? run() : execa.command(command, { stdio: 'inherit' }));
    } catch (error) {
      log.write(chalk.red(` ✖ ${error.message}`));
    }
  }
};

const printFixCommands = (log: ToolingLog, results: CheckResult[]) => {
  const commands = getFixes(results).map(({ command }) => command);
  if (!commands.length) {
    return;
  }

  log.write(`\n To fix, run:`);
  commands.forEach((command) => log.write(`   ${chalk.cyan(command)}`));
  log.write(chalk.dim(`\n Or let doctor run them: node scripts/scout doctor --fix`));
};

const printNextSteps = (log: ToolingLog, archs: DoctorArch[], readyArchs: DoctorArch[]) => {
  log.write('');
  if (readyArchs.length < archs.length) {
    log.write(chalk.red.bold(' ✖ Fix the failed checks before using Scout'));
  }

  for (const arch of readyArchs) {
    const [domain, ...otherDomains] = testTargets.local
      .filter((target) => target.arch === arch)
      .map((target) => target.domain);
    log.write(chalk.green.bold(` ✔ Ready for ${arch}, start the servers and run tests with:`));
    log.write(
      `   ${chalk.cyan(
        `node scripts/scout run-tests --arch ${arch} --domain ${domain} --config <playwright_config_path>`
      )}`
    );
    log.write(chalk.dim(`   other domains: ${otherDomains.join(', ')}`));
  }

  if (readyArchs.length) {
    log.write(`\n To keep the servers running between test runs:`);
    log.write(
      `   ${chalk.cyan('node scripts/scout start-server --arch <arch> --domain <domain>')}`
    );
    log.write(
      `   ${chalk.cyan(
        'node scripts/playwright test --config <playwright_config_path> --project local'
      )}\n`
    );
  }
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

  const archs = arch ? [arch] : ARCHS;
  const readyArchs = archs.filter((checkedArch) =>
    results.every(
      ({ status, group }) => status !== 'fail' || !getGroups(checkedArch).includes(group)
    )
  );
  printNextSteps(log, archs, readyArchs);
  return readyArchs.length === archs.length;
};
