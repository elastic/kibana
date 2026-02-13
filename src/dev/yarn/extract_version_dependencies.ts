/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RunOptions } from '@kbn/dev-cli-runner';
import path from 'path';
import fs from 'fs';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { parseYarnLockFile } from './yarn_lock_v1';

const options: RunOptions = {
  description:
    'Extracts declared dependency versions from a Yarn v1 lockfile into a versions file.\n' +
    'This can be useful to set up Moon task dependencies on package versions used in the repo.',
  flags: {
    string: ['collect'],
  },
  usage: `node scripts/extract_version_dependencies <output_file_path> --collect <package_name1,package_name2,...>`,
};

export async function runCli() {
  return run(async ({ flagsReader, log }) => {
    const outputFilePath = flagsReader.getPositionals()[0];
    const dependencies = flagsReader.arrayOfStrings('collect');
    if (typeof dependencies === 'undefined') {
      throw new Error('--collect flag is required and must specify at least one package name.');
    }

    await collectDependenciesAndWriteFile(dependencies, outputFilePath, log);

    return;
  }, options);
}

async function collectDependenciesAndWriteFile(
  dependencies: string[],
  outputFilePath: string,
  log: ToolingLog
) {
  const resolvedDependencyMap = new Map<string, string>();
  const rootPackageJson = path.join(REPO_ROOT, 'package.json');
  const yarnLockPath = path.join(REPO_ROOT, 'yarn.lock');

  const pkgJson = JSON.parse(fs.readFileSync(rootPackageJson, 'utf-8'));
  const yarnLockContent = parseYarnLockFile(yarnLockPath, dependencies);
  const yarnLockEntries = Object.values(yarnLockContent);

  const allRequestedDependencies = {
    ...pkgJson.devDependencies,
    ...pkgJson.dependencies,
  };

  dependencies.forEach((dep) => {
    const declaredVersion = allRequestedDependencies[dep];
    const yarnlockEntry = yarnLockEntries.find((entry) => {
      return entry.name === dep && entry.requestedVersions.includes(declaredVersion);
    });
    resolvedDependencyMap.set(dep, yarnlockEntry!.resolvedVersion!);
  });

  const outputLines = Array.from(resolvedDependencyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, version]) => `${name}@${version}`);

  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    log.info(`Output directory ${outputDir} does not exist. Creating it...`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, outputLines.join('\n') + '\n', 'utf-8');
}
