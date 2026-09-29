/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname, relative, resolve } from 'path';
import { existsSync, statSync } from 'fs';

import type { Reporter } from 'vitest/node';
import { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import { parseShardAnnotation } from '../jest/shard_config';
import { KbnCiStatsReporter } from './reporters/ci_stats_reporter';
import { KbnJunitReporter } from './reporters/junit_reporter';
import { VITEST_CONFIG_NAME } from './vitest_config';

const findNearestConfig = (path: string): string | undefined => {
  let dir = existsSync(path) && statSync(path).isDirectory() ? path : dirname(path);
  while (dir.startsWith(REPO_ROOT)) {
    const candidate = resolve(dir, VITEST_CONFIG_NAME);
    if (existsSync(candidate)) {
      return candidate;
    }
    if (dir === REPO_ROOT) {
      return undefined;
    }
    dir = dirname(dir);
  }
  return undefined;
};

const discoverConfig = (paths: string[], cwd: string, log: ToolingLog): string => {
  const configs = new Set(
    (paths.length ? paths : [cwd]).map((path) => {
      const config = findNearestConfig(path);
      if (!config) {
        throw createFailError(
          `Unable to find a ${VITEST_CONFIG_NAME} for ${relative(REPO_ROOT, path)}`
        );
      }
      return config;
    })
  );
  if (configs.size > 1) {
    throw createFailError(
      `The given paths belong to different vitest configs, run them separately:\n${[...configs]
        .map((config) => ` - ${relative(REPO_ROOT, config)}`)
        .join('\n')}`
    );
  }
  const [config] = configs;
  log.info(`Using config ${relative(REPO_ROOT, config)}`);
  return config;
};

/**
 * `node scripts/vitest [paths...] [--config <file>] [vitest options]`
 *
 * Discovers the nearest vitest.config.js like `scripts/jest` does, accepts the CI shard
 * annotation (`config.js||shard=1/2`), and adds the Kibana JUnit and CI Stats reporters on CI.
 */
export async function runVitest(): Promise<void> {
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
  // vitest/node is ESM-only and this runs from a CommonJS entry point.
  const { parseCLI, startVitest } = await import('vitest/node');

  process.env.NODE_ENV ??= 'test';
  const cwd = process.env.INIT_CWD || process.cwd();
  const { filter, options } = parseCLI(['vitest', ...process.argv.slice(2)]);

  const paths = filter.map((path) => resolve(cwd, path));
  let shard = typeof options.shard === 'string' ? options.shard : undefined;
  let config: string;
  if (typeof options.config === 'string') {
    const annotation = parseShardAnnotation(options.config);
    config = resolve(cwd, annotation.config);
    shard = annotation.shard ?? shard;
  } else {
    config = discoverConfig(paths, cwd, log);
  }

  const reporters: Array<string | Reporter> = process.env.CI
    ? [
        'default',
        new KbnJunitReporter(),
        new KbnCiStatsReporter(
          process.env.TEST_GROUP_TYPE_UNIT ?? 'Vitest Unit Tests',
          relative(REPO_ROOT, config),
          shard
        ),
      ]
    : ['default'];

  const vitest = await startVitest(paths, {
    ...options,
    config,
    shard,
    root: REPO_ROOT,
    run: !options.watch,
    reporters,
  });

  if (!options.watch) {
    await vitest.close();
  }
}
