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
import { join } from 'path';
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

  // @ts-expect-error
  const content = Buffer.from(response.data.content, 'base64').toString('utf8');

  return JSON.parse(content);
}

async function getDependenciesDiff() {
  const oldPackageJson = await getFileContent('package.json', process.env.GITHUB_PR_MERGE_BASE!);
  const headSha = execSync('git rev-parse HEAD').toString().trim();
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
  const changedFiles = execSync(`git diff --name-only ${process.env.GITHUB_PR_MERGE_BASE} HEAD`)
    .toString()
    .trim()
    .split('\n');

  const packageJsonChanged = changedFiles.some((file) => file === 'package.json');
  const dependenciesAdded = changedFiles.some((file) => file.match('third_party_packages.txt'));

  if (!packageJsonChanged && dependenciesAdded) {
    const filePath = join(__dirname, 'third_party_packages.txt');
    execSync(`git checkout ${process.env.GITHUB_PR_MERGE_BASE} -- ${filePath}`);

    return;
  }

  const { added, removed } = await getDependenciesDiff();

  if (!added.length && !removed.length) {
    return;
  }

  const filePath = join(__dirname, 'third_party_packages.txt');
  const existingContent = await readFile(filePath, 'utf8');

  const existingLines = new Set(existingContent.split('\n').filter(Boolean));

  if (added.length && !removed.length) {
    const newEntries = added.filter((entry) => !existingLines.has(entry));

    if (newEntries.length) {
      const data = newEntries.join('\n') + '\n';
      await appendFile(filePath, data);
    }

    return;
  }

  const updatedLines = [...existingLines, ...added].filter((line) => !removed.includes(line));

  await writeFile(filePath, updatedLines.join('\n') + '\n');
}

main();
