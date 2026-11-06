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
import {
  getChangedConfigs,
  getChangedFiles,
  getChangedSpecs,
  getConfigs,
  getSpecs,
} from './configs';
import { describeRun, describeServerSet, describeTarget, formatConfig, plural } from './labels';
import type { PinnedConfig } from './pins';
import { readState, toPinned, updateState } from './pins';
import {
  forgetAnswer,
  forgetAnswers,
  getShownPrompts,
  GoBack,
  multiSelect,
  select,
} from './prompt';
import type { RunningServers } from './servers';
import { getRunningServers, isServingConfig } from './servers';
import { getTargetCoverage, isManifestOutdated, MANIFEST_UPDATE_CMD } from './targets';

export interface Selection {
  config: PinnedConfig;
  specs: string[];
  target: ScoutTestTarget;
  verbose: boolean;
  headed: boolean;
}

const unique = (values: string[]) => [...new Set(values)].sort();

/** Picks one value of a config field, hinting how many configs share it */
const pickFacet = (message: string, configs: PickableConfig[], field: 'group' | 'module') =>
  select(
    message,
    unique(configs.map((item) => item[field])).map((value) => ({
      label: value,
      value,
      hint: plural(configs.filter((item) => item[field] === value).length, 'config'),
    }))
  );

/** The servers a config needs, marked when they already run for one of its targets */
const serversHint = (config: PinnedConfig, running: RunningServers[]) => {
  const servers = describeServerSet(config.configSet);
  const isRunning = running.some((server) =>
    config.targets.some((tag) => isServingConfig(server, config, ScoutTestTarget.fromTag(tag)))
  );
  return [
    config.configSet === 'default' ? servers : chalk.yellow(servers),
    // without one, the targets each spec runs on cost a Playwright listing to find out
    ...(config.hasManifest ? [] : [chalk.yellow('no manifest yet')]),
    ...(isRunning ? [chalk.green('● running')] : []),
  ].join('  ');
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
        forgetAnswers();
      }
      step = next;
    } catch (error) {
      if (!(error instanceof GoBack)) {
        throw error;
      }
      // the question Esc goes back to is about to be asked again
      forgetAnswer();
      step = asked.pop() ?? step;
    }
  }
  // what follows the questions, the run and the menu after it, is not a step to go back to
  forgetAnswers();
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
  | 'target';

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
  const verbose = state.verbose ?? false;

  const getConfig = () => {
    if (!config) {
      throw new Error('No config picked');
    }
    return config;
  };

  const steps: Record<Step, () => Promise<Step | undefined>> = {
    group: async () => {
      group = await pickFacet('Where are the tests?', loadConfigs(), 'group');
      return 'module';
    },
    module: async () => {
      const inGroup = loadConfigs().filter((item) => item.group === group);
      module = await pickFacet('Module', inGroup, 'module');
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
      if (choice === 'find') {
        return 'group';
      }
      if (choice === 'edit' || choice === 'changed') {
        return choice;
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
      // deliberately not awaited yet, so git and the config loading overlap
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
          hint: `${plural(entry.specs.length, 'changed spec')} · ${serversHint(
            entry.config,
            running
          )}`,
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
      const { specs: changedSpecs = [] } = changedConfig ?? {};

      const scope = await select('Run', [
        ...(changedSpecs.length
          ? [{ label: 'Changed specs', value: 'changed', hint: names(changedSpecs) }]
          : []),
        { label: 'Whole config', value: 'whole', hint: plural(configSpecs.length, 'spec') },
        { label: 'Pick specs', value: 'pick' },
      ]);
      specs = scope === 'changed' ? changedSpecs : [];
      return scope === 'pick' ? 'specs' : 'target';
    },
    specs: async () => {
      const configDir = Path.dirname(getConfig().path);
      // the ones you are working on are the ones you most likely came here to run
      const changed = await getChangedSpecs(configSpecs);
      specs = await multiSelect(
        'Specs',
        configSpecs.map((spec) => ({
          label: Path.relative(configDir, spec),
          value: spec,
          // preselected, so Enter runs what you edited and Space adds the rest
          ...(changed.has(spec) ? { hint: chalk.yellow('changed'), checked: true } : {}),
        }))
      );
      return 'target';
    },
    target: async () => {
      const { tags, counts, total, known } = getTargetCoverage(getConfig(), specs);
      if (!known) {
        log.write(
          chalk.yellow('No manifest entry for these specs yet, showing every target of the config')
        );
        log.write(chalk.dim(`Write one with: ${MANIFEST_UPDATE_CMD}`));
      } else if (await isManifestOutdated(getConfig().path)) {
        log.write(
          chalk.yellow(
            'The manifest predates the latest change to this config, its tags may be stale'
          )
        );
        log.write(chalk.dim(`Refresh it with: ${MANIFEST_UPDATE_CMD}`));
      }
      const choices = tags.map((tag) => {
        const value = ScoutTestTarget.fromTag(tag);
        const count = counts.get(tag) ?? 0;
        const partial = known && count < total;
        return {
          label: describeTarget(value),
          value,
          ...(partial ? { hint: chalk.yellow(`only ${count} of ${total} specs`) } : {}),
        };
      });
      target = await select('Target', choices);
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
      verbose,
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
  });
  return { config: picked, specs, target, verbose, headed };
};
