/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import chalk from 'chalk';
import { ScoutTestTarget } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ChangedConfig, PickableConfig } from './configs';
import { getChangedConfigs, getChangedFiles, getConfigs, getSpecs } from './configs';
import { describeRun, describeServerSet, formatConfig, plural } from './labels';
import type { PinnedConfig } from './pins';
import { readState, toPinned, updateState } from './pins';
import { getShownPrompts, GoBack, multiSelect, select } from './prompt';
import type { RunningServers } from './servers';
import { getRunningServers, isServingConfig } from './servers';

export interface Selection {
  config: PinnedConfig;
  specs: string[];
  target: ScoutTestTarget;
  verbose: boolean;
  headed: boolean;
}

const unique = (values: string[]) => [...new Set(values)].sort();

/** The servers a config needs, marked when they already run for one of its targets */
const serversHint = (config: PinnedConfig, running: RunningServers[]) => {
  const servers = describeServerSet(config.configSet);
  const isRunning = running.some((server) =>
    config.targets.some((tag) => isServingConfig(server, config, ScoutTestTarget.fromTag(tag)))
  );
  return `${config.configSet === 'default' ? servers : chalk.yellow(servers)}${
    isRunning ? `  ${chalk.green('● running')}` : ''
  }`;
};

const byServerSet = (a: PickableConfig, b: PickableConfig) =>
  Number(a.configSet !== 'default') - Number(b.configSet !== 'default') ||
  a.configSet.localeCompare(b.configSet) ||
  a.path.localeCompare(b.path);

const yesNo = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

/**
 * Asks questions step by step. Esc goes back to the last question that was asked,
 * coming back to the first step starts over.
 */
const runSteps = async <S extends string>(
  first: S,
  steps: Record<S, () => Promise<S | undefined>>
) => {
  const asked: S[] = [];
  let step: S | undefined = first;
  while (step) {
    const shown = getShownPrompts();
    try {
      const next: S | undefined = await steps[step]();
      if (getShownPrompts() > shown) {
        asked.push(step);
      }
      if (next === first) {
        asked.length = 0;
      }
      step = next;
    } catch (error) {
      if (!(error instanceof GoBack)) {
        throw error;
      }
      step = asked.pop() ?? step;
    }
  }
};

type Step =
  | 'group'
  | 'module'
  | 'config'
  | 'pin'
  | 'start'
  | 'edit'
  | 'changed'
  | 'scope'
  | 'specs'
  | 'target'
  | 'output';

/** Picks what to run; Scout configs are only loaded when pinned ones are not enough */
export const pickTests = async (log: ToolingLog): Promise<Selection> => {
  let configs: PickableConfig[] | undefined;
  const loadConfigs = () => {
    if (!configs) {
      log.write(chalk.dim('Loading Scout configs…'));
      configs = getConfigs();
    }
    return configs;
  };

  const state = readState();
  const { last } = state;
  let pins = state.pins ?? [];
  let pinning = !state.pins;
  let running: RunningServers[] = [];

  let group = '';
  let module = '';
  let config: PinnedConfig | undefined;
  let configSpecs: string[] = [];
  let changedConfig: ChangedConfig | undefined;
  let specs: string[] = [];
  let target: ScoutTestTarget | undefined;
  let pin = false;
  let runLast = false;
  let { verbose } = state;

  const getConfig = () => {
    if (!config) {
      throw new Error('No config picked');
    }
    return config;
  };

  const steps: Record<Step, () => Promise<Step | undefined>> = {
    group: async () => {
      const all = loadConfigs();
      group = await select(
        'Where are the tests?',
        unique(all.map((item) => item.group)).map((value) => ({
          label: value,
          value,
          hint: plural(all.filter((item) => item.group === value).length, 'config'),
        }))
      );
      return 'module';
    },
    module: async () => {
      const inGroup = loadConfigs().filter((item) => item.group === group);
      module = await select(
        'Module',
        unique(inGroup.map((item) => item.module)).map((value) => ({
          label: value,
          value,
          hint: plural(inGroup.filter((item) => item.module === value).length, 'config'),
        }))
      );
      return 'config';
    },
    config: async () => {
      running = await getRunningServers();
      const choices = loadConfigs()
        .filter((item) => item.group === group && item.module === module)
        .sort(byServerSet)
        .map((item) => ({
          label: formatConfig(item, false),
          value: item,
          hint: serversHint(item, running),
        }));
      if (pinning) {
        const picked =
          choices.length === 1 ? [choices[0].value] : await multiSelect('Configs to pin', choices);
        pins = picked.map(toPinned);
        return undefined;
      }
      config = await select('Config', choices);
      return 'pin';
    },
    pin: async () => {
      const { path } = getConfig();
      pin =
        !pins.some((item) => item.path === path) && (await select('Pin it for next time?', yesNo));
      return 'scope';
    },
    start: async () => {
      running = await getRunningServers();
      const choice = await select('What do you want to run?', [
        ...(last
          ? [
              {
                label: 'Run last',
                value: 'last',
                hint: describeRun({ ...last, target: ScoutTestTarget.fromTag(last.target) }),
              },
            ]
          : []),
        { label: 'Changed tests', value: 'changed', hint: 'on your branch or not committed' },
        ...pins.map((pinned) => ({
          label: formatConfig(pinned),
          value: pinned.path,
          hint: `pinned · ${serversHint(pinned, running)}`,
        })),
        { label: 'Find another config', value: 'find' },
        { label: 'Edit pins', value: 'edit' },
      ]);

      pin = false;
      changedConfig = undefined;
      if (choice === 'last') {
        runLast = true;
        return undefined;
      }
      if (choice === 'find' || choice === 'edit' || choice === 'changed') {
        return choice === 'find' ? 'group' : choice;
      }
      config = pins.find(({ path }) => path === choice);
      return 'scope';
    },
    edit: async () => {
      pins = await multiSelect(
        'Pinned configs (space to unpin)',
        pins.map((item) => ({ label: formatConfig(item), value: item, checked: true }))
      );
      updateState({ pins });
      return 'start';
    },
    changed: async () => {
      log.write(chalk.dim('Looking for changed tests…'));
      // git runs while all configs load
      const files = getChangedFiles();
      const changed = getChangedConfigs(await files, loadConfigs());
      if (!changed.length) {
        log.write(chalk.yellow('No changed Scout tests found'));
        return 'start';
      }

      changedConfig = await select(
        'Config',
        changed.map((entry) => ({
          label: formatConfig(entry.config),
          value: entry,
          hint: `${plural(
            entry.specs.length + entry.helpers.length,
            'changed file'
          )} · ${serversHint(entry.config, running)}`,
        }))
      );
      config = changedConfig.config;
      return 'scope';
    },
    scope: async () => {
      const { path } = getConfig();
      configSpecs = getSpecs(path);
      const configDir = Path.dirname(path);
      const names = (files: string[]) =>
        files.map((file) => Path.relative(configDir, file)).join(', ');
      const { specs: changedSpecs = [], helpers = [] } = changedConfig ?? {};

      const changedChoices = changedSpecs.length
        ? [{ label: 'Changed specs', value: 'changed', hint: names(changedSpecs) }]
        : [];
      const wholeChoice = {
        label: 'Whole config',
        value: 'whole',
        hint: `${plural(configSpecs.length, 'spec')}${
          helpers.length ? ` · uses changed ${names(helpers)}` : ''
        }`,
      };
      // page objects and fixtures may be used by any spec, so the whole config comes first then
      const scope = await select('Run', [
        ...(helpers.length ? [wholeChoice, ...changedChoices] : [...changedChoices, wholeChoice]),
        { label: 'Pick specs', value: 'pick' },
      ]);
      specs = scope === 'changed' ? changedSpecs : [];
      return scope === 'pick' ? 'specs' : 'target';
    },
    specs: async () => {
      const configDir = Path.dirname(getConfig().path);
      specs = await multiSelect(
        'Specs',
        configSpecs.map((spec) => ({ label: Path.relative(configDir, spec), value: spec }))
      );
      return 'target';
    },
    target: async () => {
      const choices = getConfig().targets.map((tag) => {
        const value = ScoutTestTarget.fromTag(tag);
        return { label: `${value.arch} · ${value.domain}`, value };
      });
      target = await select('Target', choices);
      return 'output';
    },
    output: async () => {
      verbose =
        state.verbose ??
        (await select('Output', [
          { label: 'Test results', value: false },
          { label: 'Everything', value: true, hint: 'server and debug logs' },
        ]));
      return undefined;
    },
  };

  if (pinning) {
    log.write(chalk.dim("No pinned configs yet, let's find the ones you use\n"));
    await runSteps<Step>('group', steps);
    pinning = false;
    updateState({ pins });
  }
  await runSteps<Step>('start', steps);

  const headed = state.headed ?? false;
  if (runLast && last) {
    return {
      ...last,
      target: ScoutTestTarget.fromTag(last.target),
      verbose: verbose ?? false,
      headed,
    };
  }
  if (!target) {
    throw new Error('No target picked');
  }
  const picked = toPinned(getConfig());
  updateState({
    ...(pin ? { pins: [...pins, picked] } : {}),
    last: { config: picked, specs, target: target.tag },
    verbose,
  });
  return { config: picked, specs, target, verbose: verbose ?? false, headed };
};
