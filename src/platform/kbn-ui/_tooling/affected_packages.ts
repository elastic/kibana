/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';

import {
  getMoonChangedFiles,
  getAffectedMoonProjectsFromChangedFiles,
  type MoonProject,
} from '@kbn/moon';

export { type MoonProject };

export const KBN_UI_ROOT_RELATIVE = 'src/platform/kbn-ui';
export const FORCE_ALL_CHANGED_PATHS = new Set<string>([
  '.buildkite/pipelines/kbn_ui_publish.yml',
  '.buildkite/scripts/steps/kbn_ui_publish.sh',
  '.buildkite/pipeline-resource-definitions/kibana-kbn-ui-publish.yml',
]);

interface ResolveAffectedPackagesOptions {
  changedFiles: string[];
  affectedProjects: MoonProject[];
  packageNames: string[];
}

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

export const resolveAffectedPackages = ({
  changedFiles,
  affectedProjects,
  packageNames,
}: ResolveAffectedPackagesOptions): string[] => {
  if (changedFiles.length === 0) {
    return [];
  }

  if (shouldForceAllPackages(changedFiles)) {
    return packageNames;
  }

  const affectedPackageNames = new Set<string>();
  for (const project of affectedProjects) {
    const packageName = getPackageNameFromSourceRoot(project.sourceRoot, packageNames);
    if (packageName) {
      affectedPackageNames.add(packageName);
    }
  }

  return Array.from(affectedPackageNames).sort();
};

const usage = (): string => 'usage: affected_packages.ts <base-ref> [head-ref]';

const main = async (argv = process.argv.slice(2)): Promise<void> => {
  if (argv.length < 1) {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }

  const [baseRef, headRef = 'HEAD'] = argv;
  const kbnUiRoot = path.dirname(__dirname);
  const packageNames = getAllPackageNames(kbnUiRoot);
  const changedFiles = await getMoonChangedFiles({ scope: 'branch', base: baseRef, head: headRef });

  let affectedProjects: MoonProject[] = [];
  if (changedFiles.length > 0 && !shouldForceAllPackages(changedFiles)) {
    affectedProjects = await getAffectedMoonProjectsFromChangedFiles({
      changedFilesJson: JSON.stringify({ files: changedFiles }),
      downstream: 'deep',
    });
  }

  for (const packageName of resolveAffectedPackages({
    changedFiles,
    affectedProjects,
    packageNames,
  })) {
    process.stdout.write(`${packageName}\n`);
  }
};

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${(err as Error).stack ?? err}\n`);
    process.exit(1);
  });
}
