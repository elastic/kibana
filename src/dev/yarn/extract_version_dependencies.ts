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

import { parsePnpmLock, type PnpmLockGraph } from './pnpm_lock';

const options: RunOptions = {
  description:
    'Extracts declared dependency versions from the pnpm-lock.yaml file into a versions file.\n' +
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
  const pnpmLockPath = path.join(REPO_ROOT, 'pnpm-lock.yaml');

  const [packageJsonContent, pnpmLockContent] = await Promise.all([
    fs.readFile(rootPackageJson, 'utf-8'),
    fs.readFile(pnpmLockPath, 'utf-8'),
  ]);

  const outputLines = collectDependencyVersionLines({
    dependencies,
    rootPackageJsonContent: packageJsonContent,
    transitive,
    pnpmLockContent,
  });

  await fs.writeFile(outputFilePath, outputLines.join('\n') + '\n', 'utf-8');
}

export const collectDependencyVersionLines = ({
  dependencies,
  rootPackageJsonContent,
  transitive,
  pnpmLockContent,
}: {
  dependencies: string[];
  rootPackageJsonContent: string;
  transitive: boolean;
  pnpmLockContent: string;
}) => {
  const pkgJson = JSON.parse(rootPackageJsonContent);
  const graph = parsePnpmLock(pnpmLockContent);

  const allRequestedDependencies = {
    ...pkgJson.devDependencies,
    ...pkgJson.dependencies,
  };

  const rootKeys = resolveRootDependencies(dependencies, graph, allRequestedDependencies);

  const resolvedKeys = transitive
    ? collectTransitiveDependencies(rootKeys, graph)
    : new Set(rootKeys);

  return Array.from(resolvedKeys).sort((a, b) => a.localeCompare(b));
};

const resolveRootDependencies = (
  dependencies: string[],
  graph: PnpmLockGraph,
  allRequestedDependencies: Record<string, string>
) => {
  return dependencies.map((dependencyName) => {
    if (!(dependencyName in allRequestedDependencies)) {
      throw new Error(`Unable to find ${dependencyName} in the root package.json dependency list`);
    }

    const version = graph.rootVersions.get(dependencyName);
    if (!version) {
      throw new Error(
        `Unable to resolve ${dependencyName} from the pnpm-lock.yaml dependency graph`
      );
    }
    return `${dependencyName}@${version}`;
  });
};

const collectTransitiveDependencies = (rootKeys: string[], graph: PnpmLockGraph) => {
  const visited = new Set<string>();
  const queue = [...rootKeys];

  while (queue.length > 0) {
    const key = queue.shift()!;
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    for (const childKey of graph.edges.get(key) ?? []) {
      queue.push(childKey);
    }
  }

  return visited;
};
