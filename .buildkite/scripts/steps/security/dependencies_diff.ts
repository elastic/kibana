/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { appendFile, readFile, writeFile } from 'fs/promises';
import Path from 'path';
import { getGithubClient } from '#pipeline-utils';

const octokit = getGithubClient();

const INTERNAL_PACKAGE_PREFIX_REGEX = /^(@kbn|@elastic)\//;

async function getFileContent(path: string, ref: string) {
  console.info(`Fetching content for ${path} at ref ${ref}`);

  const response = await octokit.repos.getContent({
    owner: process.env.GITHUB_PR_BASE_OWNER!,
    repo: process.env.GITHUB_PR_BASE_REPO!,
    path,
    ref,
  });

  if (Array.isArray(response.data) || response.data.type !== 'file') {
    throw new Error(`Expected file at ${path}`);
  }

  // @ts-ignore ts-node doesn't infer the type of response.data.content
  const content = Buffer.from(response.data.content, 'base64').toString('utf8');

  return JSON.parse(content);
}

async function getDependenciesDiff() {
  const oldPackageJson = await getFileContent('package.json', process.env.GITHUB_PR_MERGE_BASE!);
  const headSha =
    process.env.GITHUB_PR_HEAD_SHA || execSync('git rev-parse HEAD').toString().trim();
  const newPackageJson = await getFileContent('package.json', headSha);

  const oldDeps = { ...oldPackageJson.dependencies, ...oldPackageJson.devDependencies };
  const newDeps = { ...newPackageJson.dependencies, ...newPackageJson.devDependencies };

  const newPackages = [];
  const removedPackages = [];

  console.info('Comparing dependencies...');

  for (const name in newDeps) {
    if (!oldDeps[name] && !name.match(INTERNAL_PACKAGE_PREFIX_REGEX)) {
      newPackages.push(name);
    }
  }

  for (const name in oldDeps) {
    if (!newDeps[name] && !name.match(INTERNAL_PACKAGE_PREFIX_REGEX)) {
      removedPackages.push(name);
    }
  }

  return { added: newPackages, removed: removedPackages };
}

async function main() {
  // Skipping PRs from Renovate
  if (process.env.GIT_BRANCH?.startsWith('elastic:renovate')) {
    return;
  }

  const packageJsonPath = Path.join(__dirname, '../../../../package.json');
  const thirdPartyPackagesPath = Path.join(__dirname, './third_party_packages.txt');

  const diffOutput = execSync(
    `git diff --name-only --diff-filter=M ${process.env.GITHUB_PR_MERGE_BASE} HEAD -- ${packageJsonPath} ${thirdPartyPackagesPath}`
  )
    .toString()
    .trim();

  const changedFiles = diffOutput ? diffOutput.split('\n') : [];

  const packageJsonChanged = changedFiles.includes('package.json');
  const dependenciesAdded = changedFiles.includes(thirdPartyPackagesPath);

  // Reverting changes (if dependency was added, then removed in the same PR)
  if (!packageJsonChanged && dependenciesAdded) {
    console.info(`Reverting changes for ${thirdPartyPackagesPath}`);

    try {
      execSync(`git cat-file -e ${process.env.GITHUB_PR_MERGE_BASE}:${thirdPartyPackagesPath}`, {
        stdio: 'ignore',
      });
    } catch (error) {
      console.info(`File does not exist in merge base, skipping revert`);
      return;
    }

    execSync(`git checkout ${process.env.GITHUB_PR_MERGE_BASE} -- ${thirdPartyPackagesPath}`);

    return;
  }

  const { added, removed } = await getDependenciesDiff();

  if (!added.length && !removed.length) {
    console.info('No third party packages added or removed');
    return;
  }

  const existingContent = await readFile(thirdPartyPackagesPath, 'utf8');

  const existingLines = new Set(existingContent.split('\n').filter(Boolean));

  if (added.length && !removed.length) {
    const newEntries = added.filter((entry) => !existingLines.has(entry));

    if (newEntries.length) {
      const data = newEntries.join('\n') + '\n';
      await appendFile(thirdPartyPackagesPath, data);
    }

    return;
  }

  const updatedLines = [...new Set([...added, ...existingLines])].filter(
    (line) => !removed.includes(line)
  );

  await writeFile(thirdPartyPackagesPath, updatedLines.join('\n') + '\n');
}

main();
