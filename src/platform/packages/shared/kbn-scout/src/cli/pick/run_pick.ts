/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';
import { stripVTControlCharacters } from 'util';
import chalk from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutTestTarget } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { PickableConfig } from './configs';
import { getChangedSpecs, getConfigs, getSpecs } from './configs';
import { readPins, writePins } from './pins';
import { getRunningServers } from './servers';
import { multiSelect, select } from './prompt';

const LOG_FILE = '.scout/logs/scout_pick.log';

interface Selection {
  config: PickableConfig;
  specs: string[];
  target: ScoutTestTarget;
  verbose: boolean;
}

type ServersMode = 'running' | 'with-run';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const unique = (values: string[]) => [...new Set(values)].sort();

const findConfigs = async (configs: PickableConfig[], multiple: boolean) => {
  const group = await select(
    'Where are the tests?',
    unique(configs.map((config) => config.group)).map((value) => ({
      label: value,
      value,
      hint: plural(configs.filter((config) => config.group === value).length, 'config'),
    }))
  );
  const inGroup = configs.filter((config) => config.group === group);
  const module = await select(
    'Module',
    unique(inGroup.map((config) => config.module)).map((value) => ({
      label: value,
      value,
      hint: plural(inGroup.filter((config) => config.module === value).length, 'config'),
    }))
  );

  const choices = inGroup
    .filter((config) => config.module === module)
    .map((config) => ({ label: config.label, value: config }));
  if (choices.length === 1) {
    return [choices[0].value];
  }
  return multiple ? multiSelect('Configs to pin', choices) : [await select('Config', choices)];
};

const pickTests = async (log: ToolingLog, configs: PickableConfig[]): Promise<Selection> => {
  const byPath = new Map(configs.map((config) => [config.path, config]));
  const getConfig = (path: string) => {
    const config = byPath.get(path);
    if (!config) {
      throw new Error(`${path} is not a registered Scout config`);
    }
    return config;
  };
  // a new config is only registered once its manifest exists
  const changed = new Map([...(await getChangedSpecs())].filter(([path]) => byPath.has(path)));

  let pins = readPins()?.filter((path) => byPath.has(path));
  if (!pins) {
    log.write(chalk.dim("No pinned configs yet, let's find the ones you use\n"));
    pins = (await findConfigs(configs, true)).map(({ path }) => path);
    writePins(pins);
  }

  const changedSpecs = [...changed.values()].flat();
  const start = await select('What do you want to run?', [
    ...(changed.size
      ? [
          {
            label: 'Changed tests',
            value: 'changed',
            hint: `${plural(changedSpecs.length, 'spec')} in ${plural(changed.size, 'config')}`,
          },
        ]
      : []),
    ...pins.map((path) => ({ label: getConfig(path).label, value: path, hint: 'pinned' })),
    { label: 'Find another config', value: 'find' },
  ]);

  let config: PickableConfig;
  let specs: string[] | undefined;
  if (start === 'changed') {
    const paths = [...changed.keys()];
    const path =
      paths.length === 1
        ? paths[0]
        : await select(
            'Config',
            paths.map((value) => ({
              label: getConfig(value).label,
              value,
              hint: plural(changed.get(value)?.length ?? 0, 'spec'),
            }))
          );
    config = getConfig(path);
    specs = changed.get(path);
  } else if (start === 'find') {
    [config] = await findConfigs(configs, false);
    const pin =
      !pins.includes(config.path) &&
      (await select('Pin it for next time?', [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ]));
    if (pin) {
      writePins(unique([...pins, config.path]));
    }
  } else {
    config = getConfig(start);
  }

  if (!specs) {
    const allSpecs = getSpecs(config.path);
    const whole = await select('Run', [
      { label: 'Whole config', value: true, hint: plural(allSpecs.length, 'spec') },
      { label: 'Pick specs', value: false },
    ]);
    specs = whole
      ? []
      : await multiSelect(
          'Specs',
          allSpecs.map((spec) => ({ label: spec, value: spec }))
        );
  }

  const targets = config.targets.map((target) => ({
    label: `${target.arch} · ${target.domain}`,
    value: target,
  }));
  const target = targets.length === 1 ? targets[0].value : await select('Target', targets);

  const verbose = await select('Output', [
    { label: 'Test results', value: false },
    { label: 'Everything', value: true, hint: 'server and debug logs' },
  ]);

  return { config, specs, target, verbose };
};

const findRunningServers = async ({ config, target }: Selection) => {
  const servers = await getRunningServers();
  const matching = servers.find(
    ({ arch, domain, configSet }) =>
      arch === target.arch && domain === target.domain && configSet === config.configSet
  );
  return { servers, matching };
};

const prepareServers = async (
  log: ToolingLog,
  selection: Selection
): Promise<ServersMode | undefined> => {
  const { servers, matching } = await findRunningServers(selection);
  if (matching) {
    log.write(chalk.dim(`Using the Scout servers running for this target (PID ${matching.pid})`));
    return 'running';
  }
  if (servers.length) {
    // starting servers for this target would fail on the ports they hold
    log.error(
      `Scout servers for another target are running (PID ${servers
        .map(({ pid }) => pid)
        .join(', ')}), stop them or pick their target`
    );
    return undefined;
  }

  const mode = await select<ServersMode | 'other-terminal'>('Servers', [
    { label: 'Start them in another terminal', value: 'other-terminal', hint: 'fast reruns' },
    { label: 'Start them with the tests', value: 'with-run', hint: 'stopped after each run' },
  ]);
  if (mode !== 'other-terminal') {
    return mode;
  }

  const { config, target } = selection;
  const startServer = [
    'node scripts/scout start-server',
    `--arch ${target.arch} --domain ${target.domain}`,
    ...(config.configSet === 'default' ? [] : [`--serverConfigSet ${config.configSet}`]),
  ].join(' ');
  log.write(
    `\nRun in another terminal and wait until the servers are ready:\n  ${chalk.cyan(
      startServer
    )}\n`
  );

  for (;;) {
    const ready = await select('Servers ready?', [
      { label: 'Yes', value: true },
      { label: 'Cancel', value: false },
    ]);
    if (!ready) {
      return undefined;
    }
    if ((await findRunningServers(selection)).matching) {
      return 'running';
    }
    log.write(chalk.yellow(`No Scout servers for ${target.arch} · ${target.domain} found yet`));
  }
};

const getCommand = ({ config, specs, target }: Selection, mode: ServersMode): string[] =>
  mode === 'running'
    ? [
        'node',
        'scripts/playwright',
        'test',
        ...specs,
        `--config=${config.path}`,
        '--project=local',
        `--grep=${target.playwrightTag}`,
      ]
    : [
        'node',
        'scripts/scout',
        'run-tests',
        `--arch=${target.arch}`,
        `--domain=${target.domain}`,
        specs.length ? `--testFiles=${specs.join(',')}` : `--config=${config.path}`,
      ];

/** Shows only the Playwright output of run-tests and keeps the rest in a log file */
const runQuietly = async (command: string[]) => {
  const logFile = Path.resolve(REPO_ROOT, LOG_FILE);
  Fs.mkdirSync(Path.dirname(logFile), { recursive: true });
  const output = Fs.createWriteStream(logFile);
  const child = execa(command[0], command.slice(1), {
    all: true,
    reject: false,
    env: { FORCE_COLOR: '1' },
  });

  if (child.all) {
    Readline.createInterface({ input: child.all }).on('line', (line) => {
      const plain = stripVTControlCharacters(line);
      output.write(`${plain}\n`);
      // proc runner lines look like ` proc [playwright] <output>`, with colors around the names
      if (plain.includes('proc [playwright] ')) {
        process.stdout.write(`${line.slice(line.indexOf('] ', line.indexOf('playwright')) + 2)}\n`);
      } else if (plain.includes('ERROR')) {
        process.stdout.write(`${line}\n`);
      }
    });
  }

  const { exitCode } = await child;
  output.end();
  return exitCode;
};

const runTests = async (log: ToolingLog, selection: Selection, mode: ServersMode) => {
  const command = getCommand(selection, mode);
  log.write(`\n${chalk.cyan('▶')} ${command.join(' ')}\n`);

  let exitCode: number;
  if (mode === 'with-run' && !selection.verbose) {
    log.write(chalk.dim(`Starting servers, full output in ${LOG_FILE}\n`));
    exitCode = await runQuietly(command);
  } else {
    ({ exitCode } = await execa(command[0], command.slice(1), {
      stdio: 'inherit',
      reject: false,
      env: selection.verbose ? { SCOUT_LOG_LEVEL: 'debug' } : {},
    }));
  }

  log.write(
    exitCode === 0
      ? chalk.green.bold('\n✔ Tests passed\n')
      : chalk.red.bold(`\n✖ Tests failed (exit code ${exitCode})\n`)
  );
  return exitCode;
};

export const runPick = async (log: ToolingLog) => {
  log.write(chalk.dim('Loading Scout configs…'));
  const configs = getConfigs();

  for (;;) {
    const selection = await pickTests(log, configs);
    let next: 'again' | 'pick' | 'exit' = 'again';
    while (next === 'again') {
      const mode = await prepareServers(log, selection);
      if (mode) {
        process.exitCode = await runTests(log, selection, mode);
      }
      next = await select('What next?', [
        { label: 'Run the same tests again', value: 'again' },
        { label: 'Pick other tests', value: 'pick' },
        { label: 'Exit', value: 'exit' },
      ]);
    }
    if (next === 'exit') {
      return;
    }
  }
};
