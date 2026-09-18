/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';

const SHARED_PACKAGES = [
  '@kbn/ui-shared-deps-npm',
  '@kbn/monaco',
  '@kbn/ui-shared-deps-src',
] as const;
const SUCCESSFUL_BUILD = /webpack \S+ compiled (?:successfully|with \d+ warnings?)/;
const REBUILD_QUIET_TIME_MS = 500;

export interface SharedPackagesWatcher {
  close: () => Promise<void>;
  onRebuild: (callback: () => void) => void;
}

export async function watchSharedPackages({
  repoRoot,
  dist = false,
  log,
}: {
  repoRoot: string;
  dist?: boolean;
  log?: ToolingLog;
}): Promise<SharedPackagesWatcher> {
  let onRebuild = () => {};
  let rebuildTimeout: NodeJS.Timeout | undefined;
  const scheduleRebuild = () => {
    clearTimeout(rebuildTimeout);
    // ponytail: Replace this output-quiescence window with lifecycle IPC if it becomes flaky.
    rebuildTimeout = setTimeout(onRebuild, REBUILD_QUIET_TIME_MS);
  };
  const watchers = [
    startPackageWatcher(SHARED_PACKAGES[0], repoRoot, dist, log, scheduleRebuild),
    startPackageWatcher(SHARED_PACKAGES[1], repoRoot, dist, log, scheduleRebuild),
  ];

  try {
    await watchers[0].ready;
    watchers.push(startPackageWatcher(SHARED_PACKAGES[2], repoRoot, dist, log, scheduleRebuild));
    await Promise.all(watchers.map(({ ready }) => ready));
  } catch (error) {
    await closeWatchers(watchers);
    throw error;
  }

  log?.success('Shared frontend bundles are ready and watching for changes.');

  return {
    close() {
      clearTimeout(rebuildTimeout);
      return closeWatchers(watchers);
    },
    onRebuild(callback) {
      onRebuild = callback;
    },
  };
}

export async function buildSharedPackages({
  repoRoot,
  dist = false,
  cache = true,
  log,
}: {
  repoRoot: string;
  dist?: boolean;
  cache?: boolean;
  log?: ToolingLog;
}): Promise<void> {
  const args = ['kbn', 'build-shared'];
  if (dist) {
    args.push('--dist');
  }
  if (!cache) {
    args.push('--no-cache');
  }

  log?.info('Preparing shared frontend bundles...');
  await execa('pnpm', args, { cwd: repoRoot, stdio: 'inherit' });
}

function startPackageWatcher(
  packageName: (typeof SHARED_PACKAGES)[number],
  repoRoot: string,
  dist: boolean,
  log: ToolingLog | undefined,
  onRebuild: () => void
) {
  const args = ['--filter', packageName, 'run', 'build', '--watch'];
  if (dist) {
    args.push('--dist');
  }
  const child = execa('pnpm', args, {
    all: true,
    cwd: repoRoot,
  });
  let isReady = false;
  let output = '';

  const ready = new Promise<void>((resolve, reject) => {
    child.all?.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
      output += chunk.toString();

      const lines = output.split('\n');
      output = lines.pop() ?? '';

      for (const line of lines) {
        if (!SUCCESSFUL_BUILD.test(line)) {
          continue;
        }
        if (isReady) {
          onRebuild();
        } else {
          isReady = true;
          resolve();
        }
      }
    });

    void child.then(
      () => {
        if (!isReady) {
          reject(new Error(`${packageName} shared bundle watcher stopped before it was ready`));
        }
      },
      (error) => {
        if (!isReady) {
          reject(error);
        } else {
          log?.error(`${packageName} shared bundle watcher stopped: ${error.message}`);
        }
      }
    );
  });

  return { child, ready };
}

async function closeWatchers(
  watchers: Array<ReturnType<typeof startPackageWatcher>>
): Promise<void> {
  for (const { child } of watchers) {
    child.kill('SIGTERM', { forceKillAfterTimeout: 5000 });
  }
  await Promise.all(watchers.map(({ child }) => child.catch(() => undefined)));
}
