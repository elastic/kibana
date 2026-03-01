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

async function lintFiles({
  procRunner,
  options,
}: {
  procRunner: ProcRunner;
  options: { fix: boolean; stopExisting: boolean; paths?: string[] };
}) {
  const { stopExisting, paths } = options;

  if (stopExisting) {
    await procRunner.stop('oxlint');
  }

  await procRunner.run('oxlint', {
    cmd: 'oxlint',
    args: [...(options.fix ? ['--fix'] : []), '--config', '.oxlintrc.json', ...(paths ?? [])],
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
  // null signals that a full scan is needed (e.g. FSEvents dropped events on macOS)
  let pendingPaths: Set<string> | null = new Set();

  const DEBOUNCE_MS = 500;

  const subscription = await Pw.subscribe(
    REPO_ROOT,
    (err, events) => {
      if (err) {
        // macOS FSEvents drops events when too many files change at once (e.g. during git checkout).
        // Fall back to a full scan rather than logging a spurious error.
        if (err.message?.includes('Events were dropped by the FSEvents client')) {
          pendingPaths = null;
        } else {
          log.error(`Error watching files: ${err}`);
          return;
        }
      } else {
        const relevant = events.filter(
          (e) => e.type !== 'delete' && LINTABLE_EXTENSIONS.has(Path.extname(e.path))
        );

        if (relevant.length === 0 && pendingPaths !== null && pendingPaths.size === 0) {
          return;
        }

        if (pendingPaths !== null) {
          for (const { path } of relevant) {
            pendingPaths.add(path);
          }
        }
      }

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        const paths = pendingPaths !== null ? [...pendingPaths] : undefined;
        pendingPaths = new Set();
        debounceTimer = undefined;
        try {
          await lintFiles({ procRunner, options: { fix: options.fix, stopExisting: true, paths } });
        } catch {
          log.debug('Lint run failed, continuing to watch...');
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
    log.debug('Lint run failed, continuing to watch...');
  }

  log.info('Watching for changes... (Ctrl+C to exit)');

  await new Promise<void>(() => {});
}
