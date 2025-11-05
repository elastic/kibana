/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { fork } from 'child_process';
import fs from 'fs';

import { ToolingLogTextWriter } from '@kbn/tooling-log';
import type { LogLevel, ToolingLog } from '@kbn/tooling-log';
import globby from 'globby';

import type { Task } from '../lib';
import { write } from '../lib';

const EUI_THEME_RE = /\.v\d\.(light|dark)\.css$/;
const ASYNC_CHUNK_RE = /\.chunk\.\d+\.js$/;
const ASSET_DIR_FLAG = '--asset-dir';
const WORKER_LOG_LEVEL_ENV = 'OPTIMIZE_ASSETS_LOG_LEVEL';
const WORKER_SCRIPT = Path.resolve(__dirname, 'generate_packages_optimized_assets_worker.js');

const getSize = (paths: string[]) => paths.reduce((acc, path) => acc + fs.statSync(path).size, 0);

/**
 * Determine the log level used by the primary build log so the worker mirrors verbosity.
 */
const getWorkerLogLevel = (log: ToolingLog): LogLevel => {
  const writer = log
    .getWriters()
    .find(
      (candidate): candidate is ToolingLogTextWriter => candidate instanceof ToolingLogTextWriter
    );

  return (writer?.level.name as LogLevel) ?? 'info';
};

type WorkerLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'success' | 'verbose';

interface WorkerMessage {
  type: 'log';
  level: WorkerLogLevel;
  args: unknown[];
}

/**
 * Spawn a child process to run the asset optimization so CPU-heavy work happens off the main thread.
 */
const runOptimizeAssetsInChildProcess = async ({
  assetDir,
  log,
  logLevel,
}: {
  assetDir: string;
  log: ToolingLog;
  logLevel: LogLevel;
}) => {
  log.info('Creating optimized assets for %s', assetDir);

  await log.indent(4, async () => {
    log.debug('Starting optimize-assets worker for %s', assetDir);

    await new Promise<void>((resolve, reject) => {
      const child = fork(WORKER_SCRIPT, [ASSET_DIR_FLAG, assetDir], {
        env: {
          ...process.env,
          [WORKER_LOG_LEVEL_ENV]: logLevel,
        },
        cwd: process.cwd(),
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      });

      const logWithLevels = log as unknown as Record<
        WorkerLogLevel,
        (...methodArgs: unknown[]) => void
      >;

      const handleMessage = (message: WorkerMessage) => {
        if (!message || message.type !== 'log') {
          return;
        }

        const { level, args } = message;
        if (!Array.isArray(args)) {
          return;
        }

        const logMethod = logWithLevels[level];
        if (typeof logMethod === 'function') {
          logMethod.apply(log, args as []);
          return;
        }

        log.debug(...(args as []));
      };

      child.on('message', handleMessage);

      child.once('error', (error) => {
        child.removeListener('message', handleMessage);
        reject(error);
      });

      child.once('exit', (code) => {
        child.removeListener('message', handleMessage);

        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`optimize-assets worker exited with code ${code ?? 'null'}`));
      });
    });
  });
};

type Category = ReturnType<typeof getCategory>;
const getCategory = (relative: string) => {
  if (EUI_THEME_RE.test(relative)) {
    return 'euiTheme';
  }

  if (relative.endsWith('.css')) {
    return 'css';
  }

  if (relative.endsWith('.ttf')) {
    return 'font';
  }

  if (ASYNC_CHUNK_RE.test(relative)) {
    return 'asyncChunk';
  }

  if (relative.includes('kbn-ui-shared-deps-npm')) {
    return 'npm';
  }

  if (relative.includes('kbn-ui-shared-deps-src')) {
    return 'src';
  }

  throw new Error(`unable to categorize file [${relative}]`);
};

function categorizeAssets(assetDirs: string[]) {
  const assets = assetDirs.flatMap((assetDir) =>
    globby
      .sync(['**/*'], {
        cwd: assetDir,
        ignore: ['*-manifest.json', '*.gz', '*.br'],
        absolute: true,
      })
      .map((path): { path: string; category: Category } => ({
        path,
        category: getCategory(Path.relative(assetDir, path)),
      }))
  );

  const groups = new Map<Category, string[]>();
  const add = (cat: Category, path: string) => {
    const group = groups.get(cat) ?? [];
    group.push(path);
    groups.set(cat, group);
  };

  for (const { path, category } of assets) {
    if (category === 'euiTheme') {
      // only track borealis.light theme
      if (path.includes('borealis.light')) {
        add('css', path);
      }
      continue;
    }

    add(category, path);
  }

  return groups;
}

export const GeneratePackagesOptimizedAssets: Task = {
  description: 'Generates Optimized Assets for Packages',

  async run(config, log, build) {
    const npmAssetDir = build.resolvePath(
      `node_modules/@kbn/ui-shared-deps-npm/shared_built_assets`
    );
    const srcAssetDir = build.resolvePath(
      `node_modules/@kbn/ui-shared-deps-src/shared_built_assets`
    );
    const assetDirs = [npmAssetDir, srcAssetDir];
    const workerLogLevel = getWorkerLogLevel(log);

    // process assets in each ui-shared-deps package concurrently using workers for isolation
    await Promise.all(
      assetDirs.map(async (assetDir) =>
        runOptimizeAssetsInChildProcess({ assetDir, log, logLevel: workerLogLevel })
      )
    );

    // analyze assets to produce metrics.json file
    const groups = categorizeAssets(assetDirs);
    log.verbose('categorized assets', groups);
    const metrics = [
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-npmDll',
        value: getSize(groups.get('npm') ?? []),
      },
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-srcJs',
        value: getSize(groups.get('src') ?? []),
      },
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-css',
        value: getSize(groups.get('css') ?? []),
      },
      {
        group: 'page load bundle size',
        id: 'kbnUiSharedDeps-fonts',
        value: getSize(groups.get('font') ?? []),
      },
    ];
    log.verbose('metrics:', metrics);

    // write unified metrics to the @kbn/ui-shared-deps-src asset dir
    log.debug('Create metrics.json');
    await write(Path.resolve(srcAssetDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  },
};
