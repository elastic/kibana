/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { parse } from 'yaml';

export interface MoonProject {
  id: string;
  sourceRoot: string;
}

export const KBN_UI_ROOT_RELATIVE = 'src/platform/kbn-ui';
export const FORCE_ALL_CHANGED_PATHS = new Set<string>([
  '.buildkite/pipelines/kbn_ui_publish.yml',
  '.buildkite/scripts/steps/kbn_ui_publish.sh',
  '.buildkite/pipeline-resource-definitions/kibana-kbn-ui-publish.yml',
]);

interface MoonYml {
  id: string;
  dependsOn?: string[];
}

interface ResolveAffectedPackagesOptions {
  changedFiles: string[];
  affectedProjects: MoonProject[];
  packageNames: string[];
  kbnUiRoot: string;
}

interface MoonChangedFilesResponse {
  files: string[];
}

interface MoonProjectsResponse {
  projects: Array<{
    id: string;
    source: string;
    config?: {
      project?: {
        metadata?: {
          sourceRoot?: string;
        };
      };
    };
  }>;
}

const getMoonExecutablePath = (repoRoot: string): string => {
  const moonBinPath = path.resolve(repoRoot, 'node_modules/.bin/moon');
  if (fs.existsSync(moonBinPath)) {
    return moonBinPath;
  }

  return execFileSync('yarn', ['--silent', 'which', 'moon'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
};

const runMoonQuery = (repoRoot: string, args: string[], input?: string): string =>
  execFileSync(getMoonExecutablePath(repoRoot), args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI_STATS_DISABLED: 'true',
    },
    input,
  });

const getMoonChangedFiles = ({
  base,
  head,
  repoRoot,
}: {
  base: string;
  head: string;
  repoRoot: string;
}): string[] => {
  const { files } = JSON.parse(
    runMoonQuery(repoRoot, ['query', 'changed-files', '--base', base, '--head', head])
  ) as MoonChangedFilesResponse;

  return files
    .map((file) => path.normalize(file).split(path.sep).join('/'))
    .filter((file) => fs.existsSync(path.resolve(repoRoot, file)))
    .sort((a, b) => a.localeCompare(b));
};

const getAffectedMoonProjectsFromChangedFiles = ({
  changedFiles,
  repoRoot,
}: {
  changedFiles: string[];
  repoRoot: string;
}): MoonProject[] => {
  const { projects } = JSON.parse(
    runMoonQuery(
      repoRoot,
      ['query', 'projects', '--affected', '--downstream', 'deep'],
      JSON.stringify({ files: changedFiles })
    )
  ) as MoonProjectsResponse;

  return projects.map((project) => ({
    id: project.id,
    sourceRoot: path
      .normalize(project.config?.project?.metadata?.sourceRoot ?? project.source)
      .split(path.sep)
      .join('/'),
  }));
};

const getAllPackageNames = (kbnUiRoot: string): string[] =>
  fs
    .readdirSync(kbnUiRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();

export const shouldForceAllPackages = (changedFiles: string[]): boolean =>
  changedFiles.some(
    (filePath) =>
      filePath.startsWith(`${KBN_UI_ROOT_RELATIVE}/_tooling/`) ||
      FORCE_ALL_CHANGED_PATHS.has(filePath)
  );

export const getPackageNameFromSourceRoot = (
  sourceRoot: string,
  packageNames: string[]
): string | undefined => {
  if (!sourceRoot.startsWith(`${KBN_UI_ROOT_RELATIVE}/`)) {
    return undefined;
  }

  const packageName = sourceRoot.slice(KBN_UI_ROOT_RELATIVE.length + 1).split('/')[0];
  return packageNames.includes(packageName) ? packageName : undefined;
};

/**
 * Returns `packageNames` in topological order (dependencies before dependents)
 * using each package's moon.yml `dependsOn` field. Only intra-kbn-ui edges are
 * considered; dependencies on packages outside kbn-ui don't affect ordering.
 * Alphabetical tie-breaking ensures deterministic output.
 * Throws if a dependency cycle is detected.
 */
export const topologicallySortPackages = (packageNames: string[], kbnUiRoot: string): string[] => {
  // Read each packages moon.yml
  const moonData = new Map<string, MoonYml>();
  for (const name of packageNames) {
    moonData.set(
      name,
      parse(fs.readFileSync(path.join(kbnUiRoot, name, 'moon.yml'), 'utf-8')) as MoonYml
    );
  }

  // Map @kbn/... id -> directory name (so that its kbn-ui packages only)
  const idToName = new Map<string, string>();
  for (const [name, { id }] of moonData) {
    idToName.set(id, name);
  }

  // dependents[A] = packages that must come AFTER A in the build order.
  const dependents = new Map<string, Set<string>>(packageNames.map((n) => [n, new Set()]));
  const inDegree = new Map<string, number>(packageNames.map((n) => [n, 0]));

  for (const [name, { dependsOn = [] }] of moonData) {
    for (const depId of dependsOn) {
      const depName = idToName.get(depId);
      if (depName !== undefined) {
        dependents.get(depName)!.add(name);
        inDegree.set(name, inDegree.get(name)! + 1);
      }
    }
  }

  const queue = packageNames.filter((n) => inDegree.get(n) === 0).sort();
  const sorted: string[] = [];

  while (queue.length > 0) {
    const name = queue.shift()!;
    sorted.push(name);
    for (const dep of [...dependents.get(name)!].sort()) {
      const deg = inDegree.get(dep)! - 1;
      inDegree.set(dep, deg);
      if (deg === 0) {
        const pos = queue.findIndex((n) => n > dep);
        queue.splice(pos === -1 ? queue.length : pos, 0, dep);
      }
    }
  }

  if (sorted.length !== packageNames.length) {
    const cycled = packageNames.filter((n) => !sorted.includes(n));
    throw new Error(`Cyclic dependency detected among kbn-ui packages: ${cycled.join(', ')}`);
  }

  return sorted;
};

export const resolveAffectedPackages = ({
  changedFiles,
  affectedProjects,
  packageNames,
  kbnUiRoot,
}: ResolveAffectedPackagesOptions): string[] => {
  if (changedFiles.length === 0) {
    return [];
  }

  if (shouldForceAllPackages(changedFiles)) {
    return topologicallySortPackages(packageNames, kbnUiRoot);
  }

  const affectedPackageNames = new Set<string>();
  for (const project of affectedProjects) {
    const packageName = getPackageNameFromSourceRoot(project.sourceRoot, packageNames);
    if (packageName) {
      affectedPackageNames.add(packageName);
    }
  }

  return topologicallySortPackages(Array.from(affectedPackageNames), kbnUiRoot);
};

const usage = (): string => 'usage: kbn_ui_affected_packages.ts <base-ref> [head-ref]';

export const main = async (
  argv = process.argv.slice(2),
  repoRoot = process.cwd()
): Promise<void> => {
  if (argv.length < 1) {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }

  const [baseRef, headRef = 'HEAD'] = argv;
  const kbnUiRoot = path.resolve(repoRoot, KBN_UI_ROOT_RELATIVE);
  const packageNames = getAllPackageNames(kbnUiRoot);
  const changedFiles = getMoonChangedFiles({ base: baseRef, head: headRef, repoRoot });

  let affectedProjects: MoonProject[] = [];
  if (changedFiles.length > 0 && !shouldForceAllPackages(changedFiles)) {
    affectedProjects = getAffectedMoonProjectsFromChangedFiles({ changedFiles, repoRoot });
  }

  for (const packageName of resolveAffectedPackages({
    changedFiles,
    affectedProjects,
    packageNames,
    kbnUiRoot,
  })) {
    process.stdout.write(`${packageName}\n`);
  }
};
