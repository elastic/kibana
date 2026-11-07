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
import type { ToolingLog } from '@kbn/tooling-log';
import { testTargets } from '@kbn/scout-info';
import { kibanaPackageJson } from '@kbn/repo-info';
import type { CheckResult, DoctorArch, DoctorCheck, DoctorLocation, Fix } from './types';
import { DOCTOR_ARCHS, DOCTOR_LOCATIONS, fail } from './types';
import { environmentChecks } from './checks/environment';
import { playwrightChecks } from './checks/playwright';
import { localServerChecks } from './checks/local_servers';
import { esSnapshotChecks } from './checks/es_snapshot';
import { dockerChecks } from './checks/docker';
import { qafChecks } from './checks/qaf';
import {
  CUSTOM_ROLE,
  getQafCloudChecks,
  getScoutCloudChecks,
  hasQafCustomRoleUser,
} from './checks/elastic_cloud';

type DoctorTarget = 'qaf' | 'scout' | 'local';

interface DoctorSection {
  target?: DoctorTarget;
  checks: DoctorCheck[];
}

interface ReportedResult extends CheckResult {
  check: DoctorCheck;
  target?: DoctorTarget;
}

interface DoctorOptions {
  location?: DoctorLocation;
  arch?: DoctorArch;
  fix: boolean;
}

const QAF_NAME = 'scout-tests';
const CONFIG_PLACEHOLDER = '--config <playwright_config_path>';

// QAF has no single create-and-run command, so chain them with the same name.
// Without --kibana-repo-root QAF runs its own Kibana clone, not this checkout.
const getRunCommands = (location: DoctorLocation, arch: DoctorArch): string[] => {
  if (location === 'local') {
    const domain = testTargets.local.find((target) => target.arch === arch)?.domain;
    return [`node scripts/scout run-tests --arch ${arch} --domain ${domain} ${CONFIG_PLACEHOLDER}`];
  }

  const create =
    arch === 'serverless'
      ? [
          `qaf elastic-cloud projects create --project-type elasticsearch --project-name ${QAF_NAME}`,
          ...(hasQafCustomRoleUser()
            ? [
                `--custom-kibana-role-names ${CUSTOM_ROLE} --custom-kibana-role-assignments ${CUSTOM_ROLE}:${CUSTOM_ROLE}`,
              ]
            : []),
        ]
      : [
          `qaf elastic-cloud deployments create --stack-version ${kibanaPackageJson.version}-SNAPSHOT --deployment-name ${QAF_NAME} --add-custom-saml-realm`,
        ];
  const target = arch === 'serverless' ? '--ec-project-name' : '--ec-deployment-name';
  return [
    ...create.map(
      (line, index) => `${index ? '  ' : ''}${line}${index < create.length - 1 ? ' \\' : ' && \\'}`
    ),
    `qaf kibana scout run-config ${target} ${QAF_NAME} --kibana-repo-root . ${CONFIG_PLACEHOLDER}`,
  ];
};

const TARGETS: Record<DoctorTarget, { title: string; location: DoctorLocation; run?: string }> = {
  qaf: { title: 'Cloud with QAF', location: 'cloud', run: 'Run on Cloud with QAF' },
  scout: { title: 'Cloud with Scout', location: 'cloud' },
  local: { title: 'Local', location: 'local', run: 'Run locally' },
};

const getSections = (): DoctorSection[] => [
  { checks: [...environmentChecks, ...playwrightChecks] },
  { target: 'local', checks: [...localServerChecks, ...esSnapshotChecks, ...dockerChecks] },
  { target: 'qaf', checks: [...qafChecks, ...getQafCloudChecks()] },
  { target: 'scout', checks: getScoutCloudChecks() },
];

const ICONS: Record<CheckResult['status'], string> = {
  pass: chalk.green('✔'),
  warn: chalk.yellow('⚠'),
  fail: chalk.red('✖'),
};
const MESSAGE_COLORS: Record<CheckResult['status'], (text: string) => string> = {
  pass: chalk.dim,
  warn: chalk.yellow,
  fail: (text) => text,
};
const PREFIX_WIDTH = '[serverless] '.length;

const formatResult = ({ status, message, details, fix, hint }: CheckResult, prefix?: string) => {
  const indent = prefix ? ' '.repeat(PREFIX_WIDTH) : '';
  const line = `   ${ICONS[status]} ${
    prefix ? chalk.dim(prefix.padEnd(PREFIX_WIDTH)) : ''
  }${MESSAGE_COLORS[status](message)}`;
  const remedy = fix ? chalk.cyan(fix.command) : hint && chalk.dim(hint);
  return [
    line,
    ...[details && chalk.dim(details), remedy]
      .filter(Boolean)
      .map((text) => `     ${indent}${text}`),
  ].join('\n');
};

const SPINNER_FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

const withSpinner = async <T>(getText: () => string, promise: Promise<T>): Promise<T> => {
  if (!process.stdout.isTTY) {
    return promise;
  }

  let frame = 0;
  const render = () =>
    process.stdout.write(
      `\r\x1b[2K   ${chalk.cyan(SPINNER_FRAMES[frame++ % SPINNER_FRAMES.length])} ${chalk.dim(
        getText()
      )}`
    );
  render();
  const timer = setInterval(render, 80);
  try {
    return await promise;
  } finally {
    clearInterval(timer);
    process.stdout.write('\r\x1b[2K');
  }
};

/** Starts all checks at once and prints each section when its checks are done */
const runChecks = async (log: ToolingLog, sections: DoctorSection[]) => {
  const running = new Map<DoctorCheck, Promise<CheckResult | undefined>>();
  const done = new Set<DoctorCheck>();

  const start = (check: DoctorCheck): Promise<CheckResult | undefined> => {
    let promise = running.get(check);
    if (!promise) {
      promise = (async () => {
        if (check.dependsOn) {
          const dependency = await start(check.dependsOn);
          if (!dependency || dependency.status === 'fail') {
            return undefined;
          }
        }
        return check.run().catch((error: Error) => fail(error.message));
      })().finally(() => done.add(check));
      running.set(check, promise);
    }
    return promise;
  };
  sections.forEach(({ checks }) => checks.forEach(start));

  const reported: ReportedResult[] = [];
  for (const { target, checks } of sections) {
    log.write(`\n ${chalk.bold(target ? TARGETS[target].title : 'General')}`);
    const results = await withSpinner(
      () => `Checking ${checks.find((check) => !done.has(check))?.title ?? ''}`,
      Promise.all(checks.map(start))
    );
    checks.forEach((check, index) => {
      const result = results[index];
      if (result) {
        reported.push({ ...result, check, target });
        log.write(formatResult(result, target && `[${check.arch ?? 'general'}]`));
      }
    });
    const isCloud = target && TARGETS[target].location === 'cloud';
    if (isCloud && results.some((result) => result && result.status !== 'pass')) {
      log.write(chalk.dim('   See the Elastic Cloud testing docs for Scout and QAF'));
    }
  }
  return reported;
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

const getCell = (results: ReportedResult[], target: DoctorTarget, arch: DoctorArch) => {
  const relevant = results.filter(
    (result) =>
      (!result.target || result.target === target) &&
      (!result.check.arch || result.check.arch === arch)
  );
  if (!relevant.some((result) => result.target === target)) {
    // e.g. there is only a config for running Scout against a stateful deployment
    return { applies: false, ready: false, text: '–', color: chalk.dim };
  }

  const failed = relevant.filter(({ status }) => status === 'fail').length;
  const warnings = relevant.filter(({ status }) => status === 'warn').length;
  if (failed) {
    return { applies: true, ready: false, text: `✖ ${failed} failed`, color: chalk.red };
  }
  return warnings
    ? {
        applies: true,
        ready: true,
        text: `✔ ready, ${warnings} warning${warnings === 1 ? '' : 's'}`,
        color: chalk.yellow,
      }
    : { applies: true, ready: true, text: '✔ ready', color: chalk.green };
};

const ROW_LABEL_WIDTH = 18;
const COLUMN_WIDTH = 22;

const toColumns = (cells: Array<{ text: string; color: (text: string) => string }>) =>
  cells
    .map(({ text, color }, index) =>
      color(index < cells.length - 1 ? text.padEnd(COLUMN_WIDTH) : text)
    )
    .join('');

/** Prints which targets and architectures are ready */
const printReadiness = (
  log: ToolingLog,
  results: ReportedResult[],
  targets: DoctorTarget[],
  archs: DoctorArch[]
) => {
  log.write(
    `\n ${' '.repeat(ROW_LABEL_WIDTH)}${toColumns(
      archs.map((arch) => ({ text: arch, color: chalk.bold }))
    )}`
  );
  return targets.map((target) => {
    const cells = archs.map((arch) => getCell(results, target, arch));
    log.write(` ${TARGETS[target].title.padEnd(ROW_LABEL_WIDTH)}${toColumns(cells)}`);
    return { target, cells };
  });
};

export const runDoctor = async (
  log: ToolingLog,
  { location, arch, fix }: DoctorOptions
): Promise<boolean> => {
  const filters = [location, arch].filter(Boolean);
  log.write(`\n ${chalk.bold.inverse(' Scout doctor ')}  ${chalk.dim(filters.join(' · '))}`);

  const locations = location ? [location] : DOCTOR_LOCATIONS;
  const archs = arch ? [arch] : DOCTOR_ARCHS;
  const getChecks = () =>
    getSections()
      .filter(({ target }) => !target || locations.includes(TARGETS[target].location))
      .map((section) => ({
        ...section,
        checks: section.checks.filter((check) => !check.arch || archs.includes(check.arch)),
      }))
      .filter(({ checks }) => checks.length);

  let sections = getChecks();
  let results = await runChecks(log, sections);
  if (fix && results.some((result) => result.fix)) {
    await applyFixes(log, results);
    log.write(`\n ${chalk.bold('Checking again')}`);
    sections = getChecks();
    results = await runChecks(log, sections);
  }

  const targets = sections.flatMap(({ target }) => (target ? [target] : []));
  const rows = printReadiness(log, results, targets, archs);

  if (!fix && results.some((result) => result.fix)) {
    const flags = [
      ...(location ? [`--location ${location}`] : []),
      ...(arch ? [`--arch ${arch}`] : []),
    ];
    log.write(
      `\n Let doctor fix them: ${chalk.cyan(
        ['node scripts/scout doctor', ...flags, '--fix'].join(' ')
      )}`
    );
  }

  const readyRows = rows.filter(({ cells }) => cells.some(({ ready }) => ready));
  if (!readyRows.length) {
    log.write(chalk.red.bold('\n ✖ Fix the failed checks before using Scout'));
  }
  for (const { target, cells } of readyRows) {
    const { location: targetLocation, run } = TARGETS[target];
    if (!run) {
      continue;
    }
    const recommended = target === 'qaf' && locations.length > 1 ? ' (recommended)' : '';
    log.write(`\n ${chalk.bold(`${run}${recommended}`)}`);
    archs
      .filter((_, index) => cells[index].ready)
      .forEach((readyArch) =>
        getRunCommands(targetLocation, readyArch).forEach((command, index) =>
          log.write(`   ${(index ? '' : readyArch).padEnd(PREFIX_WIDTH)}${chalk.cyan(command)}`)
        )
      );
    if (target === 'qaf') {
      log.write(
        chalk.dim(
          `   The first line creates a Cloud deployment or project named ${QAF_NAME}. Next time, run only the second line.`
        )
      );
    }
  }
  log.write('');

  const cells = rows.flatMap((row) => row.cells).filter(({ applies }) => applies);
  // without filters, a target you don't use (e.g. local serverless without Docker) shouldn't fail it
  return filters.length ? cells.every(({ ready }) => ready) : cells.some(({ ready }) => ready);
};
