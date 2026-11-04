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
import type { ChangedTests, PickableConfig } from './configs';
import { getChangedTests, getConfigs, getConfigsForHelper, getSpecs } from './configs';
import type { PinnedConfig } from './pins';
import { readState, toPinned, updateState } from './pins';
import type { RunningServers } from './servers';
import { getRunningServers, stopServers } from './servers';
import { getShownPrompts, GoBack, multiSelect, select } from './prompt';

const LOG_FILE = '.scout/logs/scout_pick.log';

interface Selection {
  config: PinnedConfig;
  specs: string[];
  target: ScoutTestTarget;
  verbose: boolean;
  headed: boolean;
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

const yesNo = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const describeRun = ({ config, specs, target }: Pick<Selection, 'config' | 'specs' | 'target'>) =>
  `${config.label} · ${specs.length ? plural(specs.length, 'spec') : 'all specs'} · ${
    target.arch
  } · ${target.domain}`;

/** Asks questions step by step, Esc goes back to the last question that was asked */
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
      step = next;
    } catch (error) {
      if (!(error instanceof GoBack)) {
        throw error;
      }
      step = asked.pop() ?? step;
    }
  }
};

interface ChangedConfig {
  config: PickableConfig;
  specs: string[];
  helpers: string[];
}

const groupChangedTests = ({ specs, helpers }: ChangedTests, configs: PickableConfig[]) => {
  const byPath = new Map<string, ChangedConfig>();
  const get = (config: PickableConfig) => {
    const entry = byPath.get(config.path) ?? { config, specs: [], helpers: [] };
    byPath.set(config.path, entry);
    return entry;
  };
  for (const config of configs) {
    get(config).specs.push(...(specs.get(config.path) ?? []));
  }
  for (const helper of helpers) {
    getConfigsForHelper(helper, configs).forEach((config) => get(config).helpers.push(helper));
  }
  return [...byPath.values()].filter((entry) => entry.specs.length || entry.helpers.length);
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
  const { last } = state;
  let pins = state.pins ?? [];
  let pinning = !state.pins;
  let changed: ChangedTests | undefined;

  let group = '';
  let module = '';
  let config: PinnedConfig | undefined;
  let configSpecs: string[] = [];
  let specs: string[] = [];
  let target: ScoutTestTarget | undefined;
  let pin = false;
  let runLast = false;
  let { verbose } = state;

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
      const choices = loadConfigs()
        .filter((item) => item.group === group && item.module === module)
        .map((item) => ({ label: item.label, value: item }));
      if (pinning) {
        const picked =
          choices.length === 1 ? [choices[0].value] : await multiSelect('Configs to pin', choices);
        pins = picked.map(toPinned);
        return undefined;
      }
      config = choices.length === 1 ? choices[0].value : await select('Config', choices);
      return 'pin';
    },
    pin: async () => {
      const path = config?.path;
      pin =
        !pins.some((item) => item.path === path) && (await select('Pin it for next time?', yesNo));
      return 'scope';
    },
    start: async () => {
      changed ??= await getChangedTests();
      const specCount = [...changed.specs.values()].flat().length;
      const helperCount = changed.helpers.length;
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
        ...(specCount || helperCount
          ? [
              {
                label: 'Changed tests',
                value: 'changed',
                hint: [
                  ...(specCount ? [plural(specCount, 'spec')] : []),
                  ...(helperCount ? [plural(helperCount, 'page object or fixture file')] : []),
                ].join(', '),
              },
            ]
          : []),
        ...pins.map(({ label, path }) => ({ label, value: path, hint: 'pinned' })),
        { label: 'Find another config', value: 'find' },
        { label: 'Edit pins', value: 'edit' },
      ]);

      pin = false;
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
        pins.map((item) => ({ label: item.label, value: item, checked: true }))
      );
      updateState({ pins });
      return 'start';
    },
    changed: async () => {
      // changed configs may not be pinned, so their details come from all configs
      const choices = groupChangedTests(changed ?? (await getChangedTests()), loadConfigs()).map(
        (entry) => ({
          label: entry.config.label,
          value: entry,
          hint: entry.helpers.length
            ? `all specs, ${plural(entry.helpers.length, 'changed file')}`
            : plural(entry.specs.length, 'spec'),
        })
      );
      const picked = choices.length === 1 ? choices[0].value : await select('Config', choices);
      config = picked.config;
      // page objects and fixtures may be used by any spec of the config
      specs = picked.helpers.length ? [] : picked.specs;
      return 'target';
    },
    scope: async () => {
      configSpecs = config ? getSpecs(config.path) : [];
      const whole = await select('Run', [
        { label: 'Whole config', value: true, hint: plural(configSpecs.length, 'spec') },
        { label: 'Pick specs', value: false },
      ]);
      specs = [];
      return whole ? 'target' : 'specs';
    },
    specs: async () => {
      const configDir = Path.dirname(config?.path ?? '');
      specs = await multiSelect(
        'Specs',
        configSpecs.map((spec) => ({ label: Path.relative(configDir, spec), value: spec }))
      );
      return 'target';
    },
    target: async () => {
      const choices = (config?.targets ?? []).map((tag) => {
        const value = ScoutTestTarget.fromTag(tag);
        return { label: `${value.arch} · ${value.domain}`, value };
      });
      target = choices.length === 1 ? choices[0].value : await select('Target', choices);
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
  if (!config || !target) {
    throw new Error('No tests picked');
  }
  config = toPinned(config);
  if (pin) {
    updateState({ pins: [...pins, config] });
  }
  updateState({ last: { config, specs, target: target.tag }, verbose });
  return { config, specs, target, verbose: verbose ?? false, headed };
};

const findRunningServers = async ({ config, target }: Selection) => {
  const servers = await getRunningServers();
  const matching = servers.find(
    ({ arch, domain, configSet }) =>
      arch === target.arch && domain === target.domain && configSet === config.configSet
  );
  return { servers, matching };
};

const askAboutServers = async (
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

/** Esc in a question about servers cancels the run */
const prepareServers = (log: ToolingLog, selection: Selection) =>
  askAboutServers(log, selection).catch((error) => {
    if (error instanceof GoBack) {
      return undefined;
    }
    throw error;
  });

const getCommand = (
  { config, specs, target, verbose, headed }: Selection,
  mode: ServersMode,
  onlyFailed: boolean
): string[] =>
  mode === 'running'
    ? [
        'node',
        'scripts/playwright',
        'test',
        ...specs,
        `--config=${config.path}`,
        '--project=local',
        `--grep=${target.playwrightTag}`,
        ...(headed ? ['--headed'] : []),
        ...(onlyFailed ? ['--last-failed'] : []),
      ]
    : [
        'node',
        'scripts/scout',
        'run-tests',
        ...(verbose ? [] : ['--quiet']),
        `--arch=${target.arch}`,
        `--domain=${target.domain}`,
        ...(headed ? ['--headed'] : []),
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

const runTests = async (
  log: ToolingLog,
  selection: Selection,
  mode: ServersMode,
  onlyFailed: boolean
) => {
  const command = getCommand(selection, mode, onlyFailed);
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

type Next = 'again' | 'failed' | 'toggle-headed' | 'toggle-output' | 'pick' | 'exit';

const askNext = (selection: Selection, canRunFailed: boolean) =>
  select<Next>('What next?', [
    { label: 'Run the same tests again', value: 'again' },
    ...(canRunFailed ? [{ label: 'Run failed tests only', value: 'failed' as const }] : []),
    ...(selection.config.category === 'api'
      ? []
      : [
          {
            label: selection.headed ? 'Run again headless' : 'Run again with the browser shown',
            value: 'toggle-headed' as const,
          },
        ]),
    {
      label: selection.verbose
        ? 'Run again showing test results only'
        : 'Run again showing all logs',
      value: 'toggle-output',
    },
    { label: 'Pick other tests', value: 'pick' },
    { label: 'Exit', value: 'exit' },
  ]).catch((error) => {
    // Esc goes back to picking tests
    if (error instanceof GoBack) {
      return 'pick' as const;
    }
    throw error;
  });

export const runPick = async (log: ToolingLog) => {
  for (;;) {
    const selection = await pickTests(log);
    log.write(chalk.dim(describeRun(selection)));
    let next: Next = 'again';
    let canRunFailed = false;
    while (next !== 'pick' && next !== 'exit') {
      if (next === 'toggle-output') {
        selection.verbose = !selection.verbose;
        updateState({ verbose: selection.verbose });
      } else if (next === 'toggle-headed') {
        selection.headed = !selection.headed;
        updateState({ headed: selection.headed });
      }
      const mode = await prepareServers(log, selection);
      if (mode) {
        // run-tests can't rerun failed tests, so this is only offered with running servers
        const onlyFailed = next === 'failed' && mode === 'running';
        process.exitCode = await runTests(log, selection, mode, onlyFailed);
        canRunFailed = process.exitCode !== 0 && mode === 'running';
      }
      next = await askNext(selection, canRunFailed);
    }
    if (next === 'exit') {
      return;
    }
  }
};
