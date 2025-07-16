/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { appendFile, readFile } from 'fs/promises';
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

  const newPackages: Record<string, string> = {};

  console.info('Comparing dependencies...');

  for (const name in newDeps) {
    if (!oldDeps[name] && !name.match(INTERNAL_PACKAGE_PREFIX_REGEX)) {
      newPackages[name] = newDeps[name];
    }
  }

  return newPackages;
}

async function main() {
  const newPackages = await getDependenciesDiff();
  console.info('New packages:', newPackages);

  if (Object.keys(newPackages).length) {
    const filePath = join(__dirname, 'third_party_packages.txt');
    let existingContent = '';

    try {
      existingContent = await readFile(filePath, 'utf8');
    } catch (error) {
      // File doesn't exist, will be created
    }

    const existingLines = new Set(existingContent.split('\n').filter(Boolean));

    const newEntries = Object.entries(newPackages)
      .map(([name, version]) => `${name}: ${version}`)
      .filter((entry) => !existingLines.has(entry));

    if (newEntries.length) {
      const data = newEntries.join('\n') + '\n';
      await appendFile(filePath, data);
    }
  }
}

main();
