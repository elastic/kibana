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
import fs from 'fs/promises';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { PackageInfo } from './yarn_lock_v1';
import { parseYarnLock } from './yarn_lock_v1';

const options: RunOptions = {
  description:
    'Extracts declared dependency versions from a Yarn v1 lockfile into a versions file.\n' +
    'This can be useful to set up Moon task dependencies on package versions used in the repo.',
  flags: {
    string: ['collect'],
    boolean: ['transitive'],
  },
  usage:
    `node scripts/extract_version_dependencies <output_file_path> ` +
    `--collect <package_name1> [--collect <package_name2> ...] [--transitive]`,
};

export async function runCli() {
  return run(async ({ flagsReader }) => {
    const outputFilePath = flagsReader.getPositionals()[0];
    const dependencies = flagsReader.arrayOfStrings('collect');
    const transitive = flagsReader.boolean('transitive');
    if (typeof dependencies === 'undefined') {
      throw new Error('--collect flag is required and must specify at least one package name.');
    }

    await collectDependenciesAndWriteFile(dependencies, outputFilePath, { transitive });

    return;
  }, options);
}

async function collectDependenciesAndWriteFile(
  dependencies: string[],
  outputFilePath: string,
  { transitive }: { transitive: boolean }
) {
  const rootPackageJson = path.join(REPO_ROOT, 'package.json');
  const yarnLockPath = path.join(REPO_ROOT, 'yarn.lock');

  const [packageJsonContent, yarnLockContent] = await Promise.all([
    fs.readFile(rootPackageJson, 'utf-8'),
    fs.readFile(yarnLockPath, 'utf-8'),
  ]);

  const outputLines = collectDependencyVersionLines({
    dependencies,
    rootPackageJsonContent: packageJsonContent,
    transitive,
    yarnLockContent,
  });

  await fs.writeFile(outputFilePath, outputLines.join('\n') + '\n', 'utf-8');
}

export const collectDependencyVersionLines = ({
  dependencies,
  rootPackageJsonContent,
  transitive,
  yarnLockContent,
}: {
  dependencies: string[];
  rootPackageJsonContent: string;
  transitive: boolean;
  yarnLockContent: string;
}) => {
  const pkgJson = JSON.parse(rootPackageJsonContent);
  const yarnLockEntries = Object.values(parseYarnLock(yarnLockContent));
  const requestedVersionIndex = createRequestedVersionIndex(yarnLockEntries);

  const allRequestedDependencies = {
    ...pkgJson.devDependencies,
    ...pkgJson.dependencies,
  };

  const rootDependencies = resolveRootDependencies(
    dependencies,
    requestedVersionIndex,
    allRequestedDependencies
  );

  const resolvedDependencyKeys = transitive
    ? collectTransitiveDependencies(rootDependencies, requestedVersionIndex)
    : new Set(rootDependencies.map((pkg) => `${pkg.name}@${pkg.resolvedVersion}`));

  return Array.from(resolvedDependencyKeys).sort((a, b) => a.localeCompare(b));
};

const createRequestedVersionIndex = (packages: PackageInfo[]) => {
  const index = new Map<string, PackageInfo>();

  for (const pkg of packages) {
    for (const requestedVersion of pkg.requestedVersions) {
      index.set(`${pkg.name}@${requestedVersion}`, pkg);
    }
  }

  return index;
};

const resolveDependency = (
  dependencyName: string,
  requestedVersion: string,
  requestedVersionIndex: Map<string, PackageInfo>
) => {
  const pkg = requestedVersionIndex.get(`${dependencyName}@${requestedVersion}`);

  if (!pkg?.resolvedVersion) {
    throw new Error(
      `Unable to resolve ${dependencyName}@${requestedVersion} from yarn.lock dependency graph`
    );
  }

  return pkg;
};

const resolveRootDependencies = (
  dependencies: string[],
  requestedVersionIndex: Map<string, PackageInfo>,
  allRequestedDependencies: Record<string, string>
) => {
  return dependencies.map((dependencyName) => {
    const declaredVersion = allRequestedDependencies[dependencyName];

    if (!declaredVersion) {
      throw new Error(`Unable to find ${dependencyName} in the root package.json dependency list`);
    }

    return resolveDependency(dependencyName, declaredVersion, requestedVersionIndex);
  });
};

const collectTransitiveDependencies = (
  rootDependencies: PackageInfo[],
  requestedVersionIndex: Map<string, PackageInfo>
) => {
  const visited = new Set<string>();
  const queue = [...rootDependencies];

  while (queue.length > 0) {
    const pkg = queue.shift()!;
    const packageKey = `${pkg.name}@${pkg.resolvedVersion}`;

    if (visited.has(packageKey)) {
      continue;
    }

    visited.add(packageKey);

    for (const [dependencyName, requestedVersion] of Object.entries(pkg.dependencies ?? {})) {
      queue.push(resolveDependency(dependencyName, requestedVersion, requestedVersionIndex));
    }
  }

  return visited;
};
