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
import type { CheckResult, DoctorArch, DoctorCheck, DoctorLocation, Fix } from './types';
import { DOCTOR_ARCHS, DOCTOR_LOCATIONS, fail } from './types';
import { environmentChecks } from './checks/environment';
import { playwrightChecks } from './checks/playwright';
import { localServerChecks } from './checks/local_servers';
import { esSnapshotChecks } from './checks/es_snapshot';
import { dockerChecks } from './checks/docker';
import { qafChecks } from './checks/qaf';
import { getElasticCloudChecks } from './checks/elastic_cloud';

interface DoctorSection {
  title: string;
  /** Checks for all locations when not set */
  location?: DoctorLocation;
  checks: DoctorCheck[];
}

interface ReportedResult extends CheckResult {
  check: DoctorCheck;
  location?: DoctorLocation;
}

interface DoctorOptions {
  location?: DoctorLocation;
  arch?: DoctorArch;
  fix: boolean;
}

const LOCATION_LABELS: Record<DoctorLocation, string> = { cloud: 'Cloud', local: 'Local' };

const RUN_COMMANDS: Record<DoctorLocation, { label: string; command: string }> = {
  cloud: { label: 'Run on Cloud', command: 'qaf kibana scout run-config --help' },
  local: { label: 'Run locally', command: 'node scripts/scout run-tests --help' },
};

const getSections = (): DoctorSection[] => [
  { title: 'General', checks: [...environmentChecks, ...playwrightChecks] },
  { title: 'Cloud', location: 'cloud', checks: [...qafChecks, ...getElasticCloudChecks()] },
  {
    title: 'Local',
    location: 'local',
    checks: [...localServerChecks, ...esSnapshotChecks, ...dockerChecks],
  },
];

const ICONS: Record<CheckResult['status'], string> = {
  pass: chalk.green('✔'),
  warn: chalk.yellow('⚠'),
  fail: chalk.red('✖'),
};
const PREFIX_WIDTH = '[serverless] '.length;

const formatResult = ({ status, message, fix, hint }: CheckResult, prefix?: string) => {
  const indent = prefix ? ' '.repeat(PREFIX_WIDTH) : '';
  const line = `   ${ICONS[status]} ${prefix ? chalk.dim(prefix.padEnd(PREFIX_WIDTH)) : ''}${
    status === 'pass' ? chalk.dim(message) : message
  }`;
  const remedy = fix ? chalk.cyan(fix.command) : hint && chalk.dim(hint);
  return remedy ? `${line}\n     ${indent}${remedy}` : line;
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
  for (const { title, location, checks } of sections) {
    log.write(`\n ${chalk.bold(title)}`);
    const results = await withSpinner(
      () => `Checking ${checks.find((check) => !done.has(check))?.title ?? ''}`,
      Promise.all(checks.map(start))
    );
    checks.forEach((check, index) => {
      const result = results[index];
      if (result) {
        reported.push({ ...result, check, location });
        log.write(formatResult(result, location && `[${check.arch ?? 'general'}]`));
      }
    });
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

const getCell = (results: ReportedResult[], location: DoctorLocation, arch: DoctorArch) => {
  const relevant = results.filter(
    (result) =>
      (!result.location || result.location === location) &&
      (!result.check.arch || result.check.arch === arch)
  );
  const failed = relevant.filter(({ status }) => status === 'fail').length;
  const warnings = relevant.filter(({ status }) => status === 'warn').length;
  if (failed) {
    return { ready: false, text: `✖ ${failed} failed`, color: chalk.red };
  }
  return warnings
    ? {
        ready: true,
        text: `✔ ready, ${warnings} warning${warnings === 1 ? '' : 's'}`,
        color: chalk.yellow,
      }
    : { ready: true, text: '✔ ready', color: chalk.green };
};

const ROW_LABEL_WIDTH = 12;
const COLUMN_WIDTH = 22;

const toColumns = (cells: Array<{ text: string; color: (text: string) => string }>) =>
  cells
    .map(({ text, color }, index) =>
      color(index < cells.length - 1 ? text.padEnd(COLUMN_WIDTH) : text)
    )
    .join('');

/** Prints which locations and architectures are ready */
const printReadiness = (
  log: ToolingLog,
  results: ReportedResult[],
  locations: DoctorLocation[],
  archs: DoctorArch[]
) => {
  log.write(
    `\n ${' '.repeat(ROW_LABEL_WIDTH)}${toColumns(
      archs.map((arch) => ({ text: arch, color: chalk.bold }))
    )}`
  );
  return locations.map((location) => {
    const cells = archs.map((arch) => getCell(results, location, arch));
    log.write(` ${LOCATION_LABELS[location].padEnd(ROW_LABEL_WIDTH)}${toColumns(cells)}`);
    return { location, cells };
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
      .filter((section) => !section.location || locations.includes(section.location))
      .map((section) => ({
        ...section,
        checks: section.checks.filter((check) => !check.arch || archs.includes(check.arch)),
      }));

  let results = await runChecks(log, getChecks());
  if (fix && results.some((result) => result.fix)) {
    await applyFixes(log, results);
    log.write(`\n ${chalk.bold('Checking again')}`);
    results = await runChecks(log, getChecks());
  }

  const rows = printReadiness(log, results, locations, archs);
  log.write('');

  if (!fix && results.some((result) => result.fix)) {
    const flags = [
      ...(location ? [`--location ${location}`] : []),
      ...(arch ? [`--arch ${arch}`] : []),
    ];
    log.write(
      ` Let doctor fix them: ${chalk.cyan(
        ['node scripts/scout doctor', ...flags, '--fix'].join(' ')
      )}`
    );
  }

  const readyLocations = rows.filter(({ cells }) => cells.some(({ ready }) => ready));
  if (!readyLocations.length) {
    log.write(chalk.red.bold(' ✖ Fix the failed checks before using Scout'));
  }
  const labels = readyLocations.map(
    ({ location: readyLocation }) =>
      `${RUN_COMMANDS[readyLocation].label}${
        readyLocation === 'cloud' && locations.length > 1 ? ' (recommended)' : ''
      }:`
  );
  const labelWidth = Math.max(0, ...labels.map((label) => label.length));
  readyLocations.forEach(({ location: readyLocation }, index) =>
    log.write(
      ` ${labels[index].padEnd(labelWidth)} ${chalk.cyan(RUN_COMMANDS[readyLocation].command)}`
    )
  );
  log.write('');

  const cells = rows.flatMap((row) => row.cells);
  // without filters, a target you don't use (e.g. local serverless without Docker) shouldn't fail it
  return filters.length ? cells.every(({ ready }) => ready) : cells.some(({ ready }) => ready);
};
