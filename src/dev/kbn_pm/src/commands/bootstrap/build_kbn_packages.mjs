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
import Os from 'os';

import { run } from '../../lib/spawn.mjs';
import { REPO_ROOT } from '../../lib/paths.mjs';

/**
 * Discover all @kbn/* packages that have a scripts/build.cjs file
 * but no target/ directory (i.e. they haven't been built yet).
 *
 * @returns {Array<{ name: string, dir: string }>}
 */
function discoverBuildablePackages() {
  const nodeModulesKbn = Path.resolve(REPO_ROOT, 'node_modules/@kbn');

  if (!Fs.existsSync(nodeModulesKbn)) {
    return [];
  }

  const entries = Fs.readdirSync(nodeModulesKbn, { withFileTypes: true });
  const packages = [];

  for (const entry of entries) {
    const linkPath = Path.join(nodeModulesKbn, entry.name);

    // Follow the symlink to the real package directory
    let realDir;
    try {
      realDir = Fs.realpathSync(linkPath);
    } catch {
      continue;
    }

    const buildScript = Path.join(realDir, 'scripts', 'build.cjs');
    if (!Fs.existsSync(buildScript)) {
      continue;
    }

    // Skip packages that already have a target/ directory
    const targetDir = Path.join(realDir, 'target');
    if (Fs.existsSync(targetDir)) {
      continue;
    }

    packages.push({
      name: `@kbn/${entry.name}`,
      dir: realDir,
    });
  }

  return packages;
}

/**
 * Build all @kbn/* packages that have a scripts/build.cjs but are missing
 * their target/ directory. Runs builds in parallel, bounded by CPU count.
 *
 * @param {import('@kbn/tooling-log').ToolingLog} log
 * @param {{ quiet?: boolean }} options
 */
export async function buildKbnPackages(log, { quiet } = {}) {
  const packages = discoverBuildablePackages();

  if (packages.length === 0) {
    log.info('all @kbn/* packages are already built');
    return;
  }

  log.info(`building ${packages.length} @kbn/* package(s)...`);

  const concurrency = Math.min(packages.length, Os.cpus().length);
  let completed = 0;
  let failed = 0;

  // Simple semaphore for bounded concurrency
  let running = 0;
  const queue = [];

  function acquire() {
    if (running < concurrency) {
      running++;
      return Promise.resolve();
    }
    return new Promise((resolve) => queue.push(resolve));
  }

  function release() {
    running--;
    const next = queue.shift();
    if (next) {
      running++;
      next();
    }
  }

  const promises = packages.map(async (pkg) => {
    await acquire();
    try {
      await run('node', ['scripts/build.cjs'], {
        cwd: pkg.dir,
        description: `build ${pkg.name}`,
      });
      completed++;
      if (!quiet) {
        log.debug(`  built ${pkg.name} (${completed}/${packages.length})`);
      }
    } catch (err) {
      failed++;
      log.warning(`  failed to build ${pkg.name}: ${err.message}`);
    } finally {
      release();
    }
  });

  await Promise.allSettled(promises);

  if (failed > 0) {
    log.warning(`built ${completed}/${packages.length} @kbn/* packages (${failed} failed)`);
  } else {
    log.success(`built ${completed} @kbn/* package(s)`);
  }
}
