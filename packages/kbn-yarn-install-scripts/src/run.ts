/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';

import { MANAGED_LIFECYCLES } from '.';
import type { InstallScriptsConfig, PackageInstallScript, PackageJson } from './types';

interface RunOptions {
  config: InstallScriptsConfig;
  log: ToolingLog;
  verbose?: boolean;
  dryRun?: boolean;
}

interface PackageScriptInfo {
  packagePath: string;
  packageJson: PackageJson;
  version: string;
  script: string;
}

function getPackageScriptInfo(pkg: PackageInstallScript): PackageScriptInfo {
  const packagePath = Path.join(REPO_ROOT, 'node_modules', pkg.path);
  const packageJsonPath = Path.join(packagePath, 'package.json');

  if (!Fs.existsSync(packageJsonPath)) {
    throw createFailError(
      `Package not found: ${pkg.path}\n\n` +
        `The package may not be installed. Try running:\n` +
        `  yarn kbn bootstrap`
    );
  }

  const packageJson: PackageJson = JSON.parse(Fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version || 'unknown';
  const script = packageJson.scripts?.[pkg.lifecycle];

  if (!script) {
    throw createFailError(
      `No ${pkg.lifecycle} script found in ${pkg.path}\n\n` +
        `The package.json does not contain a "${pkg.lifecycle}" script.\n` +
        `If this package no longer needs this lifecycle script, update the configuration in:\n` +
        `  packages/kbn-yarn-install-scripts/config.json`
    );
  }

  return { packagePath, packageJson, version, script };
}

function runPackageInstallScript(
  pkg: PackageInstallScript,
  log: ToolingLog,
  verbose: boolean,
  dryRun: boolean
): void {
  const { packagePath, packageJson, version, script } = getPackageScriptInfo(pkg);
  const id = `${pkg.lifecycle} for ${pkg.path}@${version}`;

  if (dryRun) {
    log.info(`[dry-run] Would run ${id}`);
    return;
  }

  log.info(`Running ${id}`);

  // Include node_modules/.bin in PATH, lifecycle scripts can reference these
  const rootBinPath = Path.join(REPO_ROOT, 'node_modules', '.bin');
  const envPath = `${rootBinPath}${Path.delimiter}${process.env.PATH || ''}`;

  const result = spawnSync(script, {
    cwd: packagePath,
    stdio: verbose ? 'inherit' : 'pipe',
    shell: true,
    env: {
      ...process.env,
      PATH: envPath,
      npm_lifecycle_event: pkg.lifecycle,
      npm_package_name: packageJson.name,
    },
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .map((b) => b?.toString().trim())
      .filter(Boolean)
      .join('\n');
    throw createFailError(`${id} failed\n${output}`);
  }
}

export function runInstallScripts(options: RunOptions): void {
  const { config, log, verbose = false, dryRun = false } = options;
  const packagesToRun = config.packages
    .filter((p) => p.required)
    .sort(
      (a, b) => MANAGED_LIFECYCLES.indexOf(a.lifecycle) - MANAGED_LIFECYCLES.indexOf(b.lifecycle)
    );

  if (!packagesToRun.length) {
    log.info('No install scripts configured to run');
    return;
  }

  log.info(`Running ${packagesToRun.length} install script(s)...`);

  for (const pkg of packagesToRun) {
    runPackageInstallScript(pkg, log, verbose, dryRun);
  }
}
