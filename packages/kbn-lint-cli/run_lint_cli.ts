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

// `oxlint.config.mjs` with `warn` rules off. Oxlint's `--fix` also fixes warnings and `--quiet`
// only hides them, so `--fix` runs against this config to fix errors only, as ESLint did.
const FIX_CONFIG = 'oxlint.fix.config.mjs';

interface LintOptions {
  fix: boolean;
  quiet: boolean;
  paths: string[];
}

run(
  async ({ log, flagsReader, procRunner, addCleanupTask }) => {
    const paths = flagsReader.getPositionals().map((t) => Path.resolve(t));
    const fix = flagsReader.boolean('fix');
    const quiet = flagsReader.boolean('quiet');
    const watch = flagsReader.boolean('watch');
    const options: LintOptions = { fix, quiet, paths };

    if (watch) {
      await watchAndLintFiles({ procRunner, log, addCleanupTask, options });
    } else {
      log.info('Linting files...');
      await lintFiles({ procRunner, options });
      log.success('Linting files completed');
    }
  },
  {
    usage: `node scripts/lint [paths...] [--fix] [--quiet] [--watch]`,
    flags: {
      boolean: ['fix', 'quiet', 'watch'],
      alias: { f: 'fix', w: 'watch' },
      help: `
        --fix              Automatically fix some issues in tsconfig.json files
        --quiet            Only report errors, not warnings
        --watch            Watch for changes and re-run linting
      `,
    },
    description: 'Validate files.',
  }
);

async function lintFiles({
  procRunner,
  options: { fix, quiet, paths },
}: {
  procRunner: ProcRunner;
  options: LintOptions;
}) {
  const runOxlint = (args: string[]) =>
    procRunner.run('oxlint', { cmd: 'oxlint', args, cwd: REPO_ROOT, wait: true });

  if (fix) {
    // The errors-only config reports exactly what `--quiet` shows, so with `--quiet` one run is
    // enough. Errors left after fixing fail this run before warnings are reported.
    await runOxlint(['--fix', '--quiet', '--config', FIX_CONFIG, ...paths]);
    if (quiet) {
      return;
    }
  }

  await runOxlint([...(quiet ? ['--quiet'] : []), '--config', 'oxlint.config.mjs', ...paths]);
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
  options: LintOptions;
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

          await lintFiles({ procRunner, options });
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
    await lintFiles({ procRunner, options });
  } catch {
    log.warning('Lint run failed, continuing to watch...');
  }

  log.info('Watching for changes... (Ctrl+C to exit)');

  await new Promise<void>(() => {});
}
