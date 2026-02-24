/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Pw from '@parcel/watcher';
import type { CleanupTask } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import type { ToolingLog } from '@kbn/tooling-log';

run(
  async ({ log, flagsReader, procRunner, addCleanupTask }) => {
    const fix = flagsReader.boolean('fix');
    const watch = flagsReader.boolean('watch');

    if (watch) {
      await watchAndLintFiles({ procRunner, log, addCleanupTask, options: { fix } });
    } else {
      log.info('Linting files...');
      await lintFiles({ procRunner, options: { fix, stopExisting: false } });
      log.success('Linting files completed');
    }
  },
  {
    usage: `node scripts/lint [...packages] [--watch] [--fix]`,
    flags: {
      boolean: ['fix', 'watch'],
      alias: { f: 'fix', w: 'watch' },
      help: `
        --fix              Automatically fix some issues in tsconfig.json files
        --watch            Watch for changes and re-run linting
      `,
    },
    description: 'Validate files.',
  }
);

const OXLINT_PROC_NAME = 'oxlint';

async function lintFiles({
  procRunner,
  options = { fix: false },
}: {
  procRunner: ProcRunner;
  options: { fix: boolean; stopExisting?: boolean };
}) {
  const { stopExisting = false } = options;
  if (stopExisting) {
    await procRunner.stop(OXLINT_PROC_NAME);
  }

  await procRunner.run(OXLINT_PROC_NAME, {
    cmd: 'oxlint',
    args: [...(options.fix ? ['--fix'] : []), '--config', '.oxlintrc.json'],
    cwd: REPO_ROOT,
    wait: true,
  });
}

async function watchAndLintFiles({
  procRunner,
  log,
  addCleanupTask,
  options,
}: {
  procRunner: ProcRunner;
  log: ToolingLog;
  addCleanupTask: (task: CleanupTask) => void;
  options: { fix: boolean };
}) {
  log.info('Linting files in watch mode...');

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const DEBOUNCE_MS = 500;

  const subscription = await Pw.subscribe(
    REPO_ROOT,
    (err) => {
      if (err) {
        log.error(`Error watching files: ${err}`);
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        debounceTimer = undefined;
        try {
          await lintFiles({ procRunner, options: { fix: options.fix, stopExisting: true } });
        } catch {
          // ProcRunner already logged the error; don't rethrow to keep watching
        }
      }, DEBOUNCE_MS);
    },
    {
      ignore: ['**/node_modules/**', '**/.git/**', '**/build/**', '**/target/**'],
    }
  );

  addCleanupTask(async () => {
    await subscription.unsubscribe();
  });

  try {
    await lintFiles({ procRunner, options: { fix: options.fix, stopExisting: false } });
  } catch {
    // ProcRunner already logged the error; don't rethrow to continue to watch mode
  }

  log.info('Watching for changes... (Ctrl+C to exit)');

  await new Promise<void>(() => {});
}
