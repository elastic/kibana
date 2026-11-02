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
import { qafChecks } from './checks/qaf';

export type DoctorArch = 'stateful' | 'serverless';
export type DoctorLocation = 'local' | 'cloud';

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

const getGroups = (location: DoctorLocation, arch?: DoctorArch): DoctorCheckGroup[] =>
  location === 'cloud'
    ? [environmentChecks, playwrightChecks, qafChecks]
    : [
        environmentChecks,
        playwrightChecks,
        localServerChecks,
        ...(arch !== 'serverless' ? [esSnapshotChecks] : []),
        ...(arch !== 'stateful' ? [dockerChecks] : []),
      ];

const runChecks = async (
  log: ToolingLog,
  location: DoctorLocation,
  arch?: DoctorArch
): Promise<ReportedResult[]> => {
  const startTime = Date.now();
  const results: ReportedResult[] = [];

  await new Listr(
    getGroups(location, arch).map((group) => ({
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

type FixWithHint = Fix & { hint?: string };

const getFixes = (results: CheckResult[]): FixWithHint[] => [
  // several checks can suggest the same command, e.g. stopping running Scout servers
  ...new Map(
    results.flatMap(({ fix, hint }) => (fix ? [[fix.command, { ...fix, hint }] as const] : []))
  ).values(),
];

const selectFixes = async (fixes: FixWithHint[]): Promise<FixWithHint[]> => {
  // without a terminal nobody can approve fixes that delete files or stop processes
  if (!process.stdin.isTTY) {
    return fixes.filter(({ destructive }) => !destructive);
  }

  const { selected } = await inquirer.prompt<{ selected: FixWithHint[] }>({
    type: 'checkbox',
    name: 'selected',
    message: 'Select fixes to run (space to toggle, a to toggle all, enter to run)',
    choices: fixes.map((fix) => ({
      name: `${chalk.cyan(fix.command)}${
        fix.destructive ? chalk.yellow(`  ${fix.hint ?? 'deletes files or stops processes'}`) : ''
      }`,
      value: fix,
      checked: !fix.destructive,
    })),
  });
  return selected;
};

const applyFixes = async (log: ToolingLog, results: CheckResult[]) => {
  const selected = await selectFixes(getFixes(results));
  if (!selected.length) {
    log.write(chalk.dim('\n No fixes selected'));
  }

  for (const { command, run } of selected) {
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

const printNextSteps = (
  log: ToolingLog,
  location: DoctorLocation,
  archs: DoctorArch[],
  readyArchs: DoctorArch[]
) => {
  log.write('');
  if (readyArchs.length < archs.length) {
    log.write(chalk.red.bold(' ✖ Fix the failed checks before using Scout'));
  }

  const locationFlag = location === 'cloud' ? ' --location cloud' : '';
  for (const arch of readyArchs) {
    const [domain, ...otherDomains] = testTargets[location]
      .filter((target) => target.arch === arch)
      .map((target) => target.domain);
    log.write(chalk.green.bold(` ✔ Ready for ${location} ${arch}, run tests with:`));
    log.write(
      `   ${chalk.cyan(
        `node scripts/scout run-tests${locationFlag} --arch ${arch} --domain ${domain} --config <playwright_config_path>`
      )}`
    );
    log.write(chalk.dim(`   other domains: ${otherDomains.join(', ')}`));
  }

  if (!readyArchs.length) {
    return;
  }
  if (location === 'cloud') {
    log.write(`\n Or with Playwright directly (ech for stateful, mki for serverless):`);
    log.write(
      `   ${chalk.cyan(
        'node scripts/playwright test --config <playwright_config_path> --project <ech|mki>'
      )}\n`
    );
    return;
  }
  log.write(`\n To keep the servers running between test runs:`);
  log.write(`   ${chalk.cyan('node scripts/scout start-server --arch <arch> --domain <domain>')}`);
  log.write(
    `   ${chalk.cyan(
      'node scripts/playwright test --config <playwright_config_path> --project local'
    )}\n`
  );
};

export const runDoctor = async (
  log: ToolingLog,
  { location, arch, fix }: { location: DoctorLocation; arch?: DoctorArch; fix: boolean }
) => {
  const target = `${location} · ${arch ?? 'stateful + serverless'}`;
  log.write(`\n ${chalk.bold.inverse(' Scout doctor ')}  ${target}\n`);

  let results = await runChecks(log, location, arch);
  if (fix && results.some((result) => result.fix)) {
    await applyFixes(log, results);
    log.write(`\n ${chalk.bold('Checking again')}\n`);
    results = await runChecks(log, location, arch);
  }
  if (!fix) {
    printFixCommands(log, results);
  }

  const archs = arch ? [arch] : ARCHS;
  const readyArchs = archs.filter((checkedArch) =>
    results.every(
      ({ status, group }) => status !== 'fail' || !getGroups(location, checkedArch).includes(group)
    )
  );
  printNextSteps(log, location, archs, readyArchs);
  return readyArchs.length === archs.length;
};
