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
import { ScoutTestTarget } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { PickableConfig } from './configs';
import { getChangedSpecs, getConfigs, getSpecs } from './configs';
import type { PinnedConfig } from './pins';
import { readState, toPinned, updateState } from './pins';
import type { RunningServers } from './servers';
import { getRunningServers, stopServers } from './servers';
import { multiSelect, select } from './prompt';

const LOG_FILE = '.scout/logs/scout_pick.log';

interface Selection {
  config: PinnedConfig;
  specs: string[];
  target: ScoutTestTarget;
  verbose: boolean;
}

type ServersMode = 'running' | 'with-run';

const describeTarget = (arch?: string, domain?: string, configSet = 'default') =>
  `${arch} · ${domain}${configSet === 'default' ? '' : ` (${configSet} servers)`}`;

const describeServers = (servers: RunningServers[]) =>
  servers
    .map(
      ({ pid, arch, domain, configSet }) =>
        `${describeTarget(arch, domain, configSet)} (PID ${pid})`
    )
    .join(', ');

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

const describeRun = ({ config, specs, target }: Omit<Selection, 'verbose'>) =>
  `${config.label} · ${specs.length ? plural(specs.length, 'spec') : 'all specs'} · ${
    target.arch
  } · ${target.domain}`;

const pickSpecs = async (config: PinnedConfig) => {
  const specs = getSpecs(config.path);
  const whole = await select('Run', [
    { label: 'Whole config', value: true, hint: plural(specs.length, 'spec') },
    { label: 'Pick specs', value: false },
  ]);
  if (whole) {
    return [];
  }
  const configDir = Path.dirname(config.path);
  return multiSelect(
    'Specs',
    specs.map((spec) => ({ label: Path.relative(configDir, spec), value: spec }))
  );
};

const pickTarget = async ({ targets }: PinnedConfig) => {
  const choices = targets.map((tag) => {
    const target = ScoutTestTarget.fromTag(tag);
    return { label: `${target.arch} · ${target.domain}`, value: target };
  });
  return choices.length === 1 ? choices[0].value : select('Target', choices);
};

/** Picks what to run; Scout configs are only loaded when pinned ones are not enough */
const pickTests = async (log: ToolingLog): Promise<Selection> => {
  let configs: PickableConfig[] | undefined;
  const loadConfigs = () => {
    if (!configs) {
      log.write(chalk.dim('Loading Scout configs…'));
      configs = getConfigs();
    }
    return configs;
  };

  const state = readState();
  let pins = state.pins;
  if (!pins) {
    log.write(chalk.dim("No pinned configs yet, let's find the ones you use\n"));
    pins = (await findConfigs(loadConfigs(), true)).map(toPinned);
    updateState({ pins });
  }

  const changed = await getChangedSpecs();
  const changedSpecs = [...changed.values()].flat();
  const { last } = state;
  const start = await select('What do you want to run?', [
    ...(last
      ? [
          {
            label: 'Run last',
            value: 'last',
            hint: describeRun({ ...last, target: ScoutTestTarget.fromTag(last.target) }),
          },
        ]
      : []),
    ...(changed.size
      ? [
          {
            label: 'Changed tests',
            value: 'changed',
            hint: `${plural(changedSpecs.length, 'spec')} in ${plural(changed.size, 'config')}`,
          },
        ]
      : []),
    ...pins.map(({ label, path }) => ({ label, value: path, hint: 'pinned' })),
    { label: 'Find another config', value: 'find' },
    { label: 'Edit pins', value: 'edit' },
  ]);

  let config: PinnedConfig | undefined = pins.find(({ path }) => path === start);
  let specs: string[] | undefined;
  if (start === 'last' && last) {
    return {
      ...last,
      target: ScoutTestTarget.fromTag(last.target),
      verbose: state.verbose ?? false,
    };
  } else if (start === 'edit') {
    const kept = await multiSelect(
      'Pinned configs (space to unpin)',
      pins.map((pin) => ({ label: pin.label, value: pin, checked: true }))
    );
    updateState({ pins: kept });
    return pickTests(log);
  } else if (start === 'changed') {
    // changed configs may not be pinned, so their details come from all configs
    const changedConfigs = loadConfigs().filter(({ path }) => changed.has(path));
    config =
      changedConfigs.length === 1
        ? changedConfigs[0]
        : await select(
            'Config',
            changedConfigs.map((value) => ({
              label: value.label,
              value,
              hint: plural(changed.get(value.path)?.length ?? 0, 'spec'),
            }))
          );
    specs = changed.get(config.path);
  } else if (start === 'find') {
    config = (await findConfigs(loadConfigs(), false))[0];
    const pin =
      !pins.some(({ path }) => path === config?.path) &&
      (await select('Pin it for next time?', [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ]));
    if (pin) {
      updateState({ pins: [...pins, toPinned(config)] });
    }
  }

  if (!config) {
    throw new Error(`Unknown choice ${start}`);
  }
  config = toPinned(config);
  specs ??= await pickSpecs(config);
  const target = await pickTarget(config);

  let verbose = state.verbose;
  if (verbose === undefined) {
    verbose = await select('Output', [
      { label: 'Test results', value: false },
      { label: 'Everything', value: true, hint: 'server and debug logs' },
    ]);
  }
  updateState({ last: { config, specs, target: target.tag }, verbose });
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
  const { config, target } = selection;
  if (servers.length) {
    // servers for this target would fail to start on the ports they hold
    log.write(
      chalk.yellow(
        `Scout servers are running for ${describeServers(
          servers
        )}, these tests need ${describeTarget(target.arch, target.domain, config.configSet)}`
      )
    );
    const stop = await select('Stop them?', [
      { label: 'Yes, stop them', value: true },
      { label: 'Cancel', value: false },
    ]);
    if (!stop) {
      return undefined;
    }
    log.write(chalk.dim('Stopping Scout servers…'));
    await stopServers(servers);
  }

  const mode = await select<ServersMode | 'other-terminal'>('Servers', [
    { label: 'Start them in another terminal', value: 'other-terminal', hint: 'fast reruns' },
    { label: 'Start them with the tests', value: 'with-run', hint: 'stopped after each run' },
  ]);
  if (mode !== 'other-terminal') {
    return mode;
  }

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

const getCommand = ({ config, specs, target, verbose }: Selection, mode: ServersMode): string[] =>
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
        ...(verbose ? [] : ['--quiet']),
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
      env: { SCOUT_LOG_LEVEL: selection.verbose ? 'debug' : 'quiet' },
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
  for (;;) {
    const selection = await pickTests(log);
    log.write(chalk.dim(describeRun(selection)));
    let next: 'again' | 'toggle-output' | 'pick' | 'exit' = 'again';
    while (next === 'again' || next === 'toggle-output') {
      if (next === 'toggle-output') {
        selection.verbose = !selection.verbose;
        updateState({ verbose: selection.verbose });
      }
      const mode = await prepareServers(log, selection);
      if (mode) {
        process.exitCode = await runTests(log, selection, mode);
      }
      next = await select('What next?', [
        { label: 'Run the same tests again', value: 'again' },
        {
          label: selection.verbose
            ? 'Run again showing test results only'
            : 'Run again showing all logs',
          value: 'toggle-output',
        },
        { label: 'Pick other tests', value: 'pick' },
        { label: 'Exit', value: 'exit' },
      ]);
    }
    if (next === 'exit') {
      return;
    }
  }
};
