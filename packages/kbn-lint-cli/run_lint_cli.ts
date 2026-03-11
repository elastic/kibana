/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Pw from '@parcel/watcher';
import type { CleanupTask } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ProcRunner } from '@kbn/dev-proc-runner';
import type { ToolingLog } from '@kbn/tooling-log';

const LINTABLE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.cts', '.mts']);

run(
  async ({ log, flagsReader, procRunner, addCleanupTask }) => {
    const paths = flagsReader.getPositionals().map((t) => Path.resolve(t));
    const fix = flagsReader.boolean('fix');
    const watch = flagsReader.boolean('watch');

    if (watch) {
      await watchAndLintFiles({ procRunner, log, addCleanupTask, options: { fix, paths } });
    } else {
      log.info('Linting files...');
      await lintFiles({ procRunner, options: { fix, paths } });
      log.success('Linting files completed');
    }
  },
  {
    usage: `node scripts/lint [paths...] [--fix] [--watch]`,
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

async function lintFiles({
  procRunner,
  options,
}: {
  procRunner: ProcRunner;
  options: { fix: boolean; paths: string[] };
}) {
  await procRunner.run('oxlint', {
    cmd: 'oxlint',
    args: [...(options.fix ? ['--fix'] : []), '--config', '.oxlintrc.json', ...options.paths],
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
  options: { fix: boolean; paths: string[] };
}) {
  log.info('Linting files in watch mode...');

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let isLinting = false;

  const DEBOUNCE_MS = 500;

  const isWithinPaths = (filePath: string) =>
    options.paths.length === 0 || options.paths.some((p) => filePath.startsWith(p));

  const subscription = await Pw.subscribe(
    REPO_ROOT,
    (err, events) => {
      if (err) {
        // macOS FSEvents drops events when too many files change at once (e.g. during git checkout).
        // Fall through to trigger a full relint rather than logging a spurious error.
        if (!err.message?.includes('Events were dropped by the FSEvents client')) {
          log.error(`Error watching files: ${err}`);
          return;
        }
      } else {
        const hasLintableChanges = events.some(
          (e) =>
            e.type !== 'delete' &&
            LINTABLE_EXTENSIONS.has(Path.extname(e.path)) &&
            isWithinPaths(e.path)
        );

        if (!hasLintableChanges) {
          return;
        }
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        debounceTimer = undefined;
        try {
          if (isLinting) {
            // Only stop if a lint is actually in progress. Since Node.js is single-threaded,
            // checking isLinting and calling stop() are synchronous, so there is no race
            // between the check and the kill signal being sent.
            await procRunner.stop('oxlint');
          }

          isLinting = true;

          await lintFiles({ procRunner, options: { fix: options.fix, paths: options.paths } });
        } catch {
          log.debug('Lint run failed, continuing to watch...');
        } finally {
          isLinting = false;
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
    await lintFiles({ procRunner, options: { fix: options.fix, paths: options.paths } });
  } catch {
    log.warning('Lint run failed, continuing to watch...');
  }

  log.info('Watching for changes... (Ctrl+C to exit)');

  await new Promise<void>(() => {});
}
