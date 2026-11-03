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
import type { ScoutTestTarget } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { PickableConfig } from './configs';
import { getChangedSpecs, getConfigs, getSpecs } from './configs';
import { readPins, writePins } from './pins';
import { getRunningServers } from './servers';
import { multiSelect, select } from './prompt';

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

const pickTarget = async (config: PickableConfig): Promise<ScoutTestTarget> => {
  const choices = config.targets.map((target) => ({
    label: `${target.arch} · ${target.domain}`,
    value: target,
  }));
  return choices.length === 1 ? choices[0].value : select('Target', choices);
};

const getCommand = async (
  log: ToolingLog,
  config: PickableConfig,
  target: ScoutTestTarget,
  specs: string[]
): Promise<string[] | undefined> => {
  const servers = await getRunningServers();
  const running = servers.find(
    ({ arch, domain, configSet }) =>
      arch === target.arch && domain === target.domain && configSet === config.configSet
  );

  if (running) {
    log.write(chalk.dim(`  Using the Scout servers already running (PID ${running.pid})`));
    return [
      'node',
      'scripts/playwright',
      'test',
      ...specs,
      `--config=${config.path}`,
      '--project=local',
      `--grep=${target.playwrightTag}`,
    ];
  }
  if (servers.length) {
    // run-tests would fail on the ports they hold
    log.error(
      `Scout servers for another target are running (PID ${servers
        .map(({ pid }) => pid)
        .join(', ')}), stop them or pick their target`
    );
    return undefined;
  }

  return [
    'node',
    'scripts/scout',
    'run-tests',
    `--arch=${target.arch}`,
    `--domain=${target.domain}`,
    specs.length ? `--testFiles=${specs.join(',')}` : `--config=${config.path}`,
  ];
};

export const runPick = async (log: ToolingLog) => {
  log.write(chalk.dim('Loading Scout configs…'));
  const configs = getConfigs();
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

  const target = await pickTarget(config);
  const command = await getCommand(log, config, target, specs);
  if (!command) {
    process.exitCode = 1;
    return;
  }

  log.write(`\n${chalk.cyan('▶')} ${command.join(' ')}\n`);
  const { exitCode } = await execa(command[0], command.slice(1), {
    stdio: 'inherit',
    reject: false,
  });
  process.exitCode = exitCode;
};
