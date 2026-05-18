#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const KBN_UI_ROOT_RELATIVE = 'src/platform/kbn-ui';
const FORCE_ALL_CHANGED_PATHS = new Set([
  '.buildkite/pipelines/kbn_ui_publish.yml',
  '.buildkite/scripts/steps/kbn_ui_publish.sh',
  '.buildkite/pipeline-resource-definitions/kibana-kbn-ui-publish.yml',
]);

function normalizeRepoPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function getAllPackageNames(kbnUiRoot) {
  return fs
    .readdirSync(kbnUiRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();
}

function shouldForceAllPackages(changedFiles) {
  return changedFiles.some(
    (filePath) =>
      filePath.startsWith(`${KBN_UI_ROOT_RELATIVE}/_tooling/`) ||
      FORCE_ALL_CHANGED_PATHS.has(filePath)
  );
}

function getProjectSourceRoot(project) {
  return normalizeRepoPath(project.config?.project?.metadata?.sourceRoot ?? project.source ?? '');
}

function getPackageNameFromSourceRoot(sourceRoot, packageNames) {
  if (!sourceRoot.startsWith(`${KBN_UI_ROOT_RELATIVE}/`)) {
    return undefined;
  }

  const packageName = sourceRoot.slice(KBN_UI_ROOT_RELATIVE.length + 1).split('/')[0];
  return packageNames.includes(packageName) ? packageName : undefined;
}

function resolveAffectedPackages({ changedFiles, affectedProjects, packageNames }) {
  if (changedFiles.length === 0) {
    return [];
  }

  if (shouldForceAllPackages(changedFiles)) {
    return packageNames;
  }

  const affectedPackageNames = new Set();
  for (const project of affectedProjects) {
    const packageName = getPackageNameFromSourceRoot(getProjectSourceRoot(project), packageNames);
    if (packageName) {
      affectedPackageNames.add(packageName);
    }
  }

  return Array.from(affectedPackageNames).sort();
}

function getMoonExecutable(repoRoot) {
  const moonBinPath = path.resolve(repoRoot, 'node_modules/.bin/moon');
  if (fs.existsSync(moonBinPath)) {
    return moonBinPath;
  }

  return execFileSync('yarn', ['--silent', 'which', 'moon'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function listChangedFiles({ repoRoot, baseRef, headRef }) {
  const stdout = execFileSync('git', ['diff', '--name-only', baseRef, headRef, '--'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return stdout
    .split('\n')
    .map((filePath) => filePath.trim())
    .filter(Boolean)
    .map(normalizeRepoPath);
}

function queryMoonAffectedProjects({ moonExecutable, repoRoot, changedFilesJson }) {
  const result = spawnSync(
    moonExecutable,
    ['query', 'projects', '--affected', '--downstream', 'deep', '--source', KBN_UI_ROOT_RELATIVE],
    {
      cwd: repoRoot,
      input: changedFilesJson,
      encoding: 'utf8',
      maxBuffer: 60 * 1024 * 1024,
      env: {
        ...process.env,
        CI_STATS_DISABLED: 'true',
      },
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || `moon query projects exited with status ${result.status}`);
  }

  return JSON.parse(result.stdout);
}

function usage() {
  return 'usage: affected_packages.js <base-ref> [head-ref]';
}

function main(argv = process.argv.slice(2)) {
  if (argv.length < 1) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const [baseRef, headRef = 'HEAD'] = argv;
  const toolingDir = __dirname;
  const kbnUiRoot = path.dirname(toolingDir);
  const repoRoot = path.resolve(kbnUiRoot, '../../..');
  const moonExecutable = getMoonExecutable(repoRoot);
  const packageNames = getAllPackageNames(kbnUiRoot);
  const changedFiles = listChangedFiles({
    repoRoot,
    baseRef,
    headRef,
  });

  let affectedProjects = [];
  if (changedFiles.length > 0 && !shouldForceAllPackages(changedFiles)) {
    const affectedProjectsResponse = queryMoonAffectedProjects({
      moonExecutable,
      repoRoot,
      changedFilesJson: JSON.stringify({ files: changedFiles }),
    });
    affectedProjects = affectedProjectsResponse.projects ?? [];
  }

  for (const packageName of resolveAffectedPackages({
    changedFiles,
    affectedProjects,
    packageNames,
  })) {
    console.log(packageName);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  FORCE_ALL_CHANGED_PATHS,
  KBN_UI_ROOT_RELATIVE,
  getPackageNameFromSourceRoot,
  resolveAffectedPackages,
  shouldForceAllPackages,
};
