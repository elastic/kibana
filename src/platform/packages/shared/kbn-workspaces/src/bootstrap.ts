/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/**
 * Shared utilities for preparing a temporary Kibana repo checkout for tasks like bundle size comparison.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import Fs from 'fs/promises';
import Path from 'path';
import { exec } from './exec';

interface CheckoutAndBootstrapOptions {
  log: ToolingLog;
  dir: string;
}

function getCurrentNodeVersion(): string {
  return process.version.replace(/^v/, '');
}
interface Package {
  engines: {
    node?: string;
    [k: string]: string | undefined;
  };
}

async function updatePackageJsonEngines(log: ToolingLog, rootDir: string, nodeVersion: string) {
  log.verbose(`Verifying Node.js version in package.json`);

  const pkgPath = Path.join(rootDir, 'package.json');
  const pkgRawContents = (await Fs.readFile(pkgPath, 'utf8')) as string;

  try {
    const pkg = JSON.parse(pkgRawContents) as Package;
    log.verbose(`Current Node.js version of package.json is v${pkg.engines.node}`);
    if (pkg.engines.node !== nodeVersion) {
      log.verbose(`Node.js version mismatch, updating v${pkg.engines.node} to v${nodeVersion}`);
      pkg.engines.node = nodeVersion;
      await Fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
  } catch (err) {
    throw new Error(`${pkgPath} is malformed, could not parse JSON`, { cause: err });
  }
}

async function writeVersionFile(
  log: ToolingLog,
  path: string,
  nodeVersion: string,
  trim: boolean = false
) {
  const filename = Path.basename(path);
  log.verbose(`Updating ${filename} with current node version v${nodeVersion}`);
  await Fs.writeFile(path, nodeVersion + (trim ? '' : '\n'), 'utf8').catch((error) => {
    throw new Error(
      `Failed to update ${filename} with current node version in ${Path.dirname(path)}`,
      { cause: error }
    );
  });
}

export async function bootstrap({ dir, log }: CheckoutAndBootstrapOptions) {
  // Ensure the workspace's package.json engines.node matches the currently running Node.js
  // version. This prevents engine checks from failing when checking out an older ref that
  // specifies an out-of-date engine range compared to the version actually in use.

  const currentNodeVersion = getCurrentNodeVersion();

  await updatePackageJsonEngines(log, dir, currentNodeVersion);

  await writeVersionFile(log, Path.join(dir, '.node-version'), currentNodeVersion, false);
  await writeVersionFile(log, Path.join(dir, '.nvmrc'), currentNodeVersion, false);

  // set ignore-engines to true to prevent validation errors from other spawned processes
  await exec(`yarn config set ignore-engines true`, {
    cwd: dir,
    log,
  });

  await exec(`yarn kbn bootstrap --force-install`, {
    log,
    cwd: dir,
    env: {
      ...process.env,
      UNSAFE_DISABLE_NODE_VERSION_VALIDATION: '1',
    },
  });
}
