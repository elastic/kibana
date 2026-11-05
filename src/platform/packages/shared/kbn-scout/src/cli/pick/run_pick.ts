/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import type { ToolingLog } from '@kbn/tooling-log';
import { describeRun } from './labels';
import type { Selection } from './pick_tests';
import { pickTests } from './pick_tests';
import { updateState } from './pins';
import { onBack, select } from './prompt';
import { runTests } from './run_tests';
import { prepareServers } from './servers';

type Next = 'again' | 'failed' | 'settings' | 'pick' | 'exit';

const browserHint = (headed: boolean) => (headed ? 'shown' : 'headless');
const outputHint = (verbose: boolean) => (verbose ? 'all logs' : 'test results only');

const describeSettings = ({ config, headed, verbose }: Selection) =>
  [
    ...(config.category === 'api' ? [] : [`browser ${browserHint(headed)}`]),
    outputHint(verbose),
  ].join(' · ');

const editSettings = async (selection: Selection) => {
  for (;;) {
    const setting = await onBack(
      select<'headed' | 'verbose' | 'done'>('Settings', [
        ...(selection.config.category === 'api'
          ? []
          : [
              {
                label: 'Browser',
                value: 'headed' as const,
                hint: browserHint(selection.headed),
              },
            ]),
        {
          label: 'Output',
          value: 'verbose',
          hint: outputHint(selection.verbose),
        },
        { label: 'Done', value: 'done' },
      ]),
      'done' as const
    );
    if (setting === 'done') {
      return;
    }
    selection[setting] = !selection[setting];
    updateState({ [setting]: selection[setting] });
  }
};

const askNext = (selection: Selection, canRunFailed: boolean) =>
  onBack(
    select<Next>('What next?', [
      { label: 'Run the same tests again', value: 'again' },
      ...(canRunFailed ? [{ label: 'Run failed tests only', value: 'failed' as const }] : []),
      { label: 'Settings', value: 'settings', hint: describeSettings(selection) },
      { label: 'Pick other tests', value: 'pick' },
      { label: 'Exit', value: 'exit' },
    ]),
    // Esc goes back to picking tests
    'pick' as const
  );

export const runPick = async (log: ToolingLog) => {
  for (;;) {
    const selection = await pickTests(log);
    log.write(chalk.dim(describeRun(selection)));
    let next: Next = 'again';
    let canRunFailed = false;
    while (next !== 'pick') {
      if (next === 'exit') {
        return;
      }
      if (next === 'settings') {
        await editSettings(selection);
      } else {
        const mode = await prepareServers(log, selection.config, selection.target);
        if (mode) {
          // run-tests can't rerun failed tests, so this is only offered with running servers
          process.exitCode = await runTests(log, selection, mode, next === 'failed');
          canRunFailed = process.exitCode !== 0 && mode === 'running';
        }
      }
      next = await askNext(selection, canRunFailed);
    }
  }
};
