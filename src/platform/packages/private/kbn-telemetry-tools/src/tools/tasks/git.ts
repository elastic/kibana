/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import { Octokit } from '@octokit/rest';
import type { TelemetrySchemaObject } from '../../schema_ftr_validations/schema_to_config_schema';

const execAsync = promisify(exec);
let octokit: null | Octokit;
let changedFilesCache: null | string[];

function getOctokit() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('Missing environment variable: GITHUB_TOKEN');
  }
  octokit =
    octokit ??
    new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

  return octokit;
}

async function fetchPrChangedFiles(
  owner = process.env.GITHUB_PR_BASE_OWNER,
  repo = process.env.GITHUB_PR_BASE_REPO,
  prNumber: undefined | string | number = process.env.GITHUB_PR_NUMBER
): Promise<string[]> {
  if (!owner || !repo || !prNumber) {
    throw Error(
      "Couldn't retrieve Github PR info from environment variables in order to retrieve PR changes"
    );
  }

  const github = getOctokit();
  const files = await github.paginate(github.pulls.listFiles, {
    owner,
    repo,
    pull_number: typeof prNumber === 'number' ? prNumber : parseInt(prNumber, 10),
    per_page: 100,
  });

  return files.map(({ filename }) => filename);
}

async function getPrChangedFiles(): Promise<string[]> {
  changedFilesCache = changedFilesCache || (await fetchPrChangedFiles());
  return changedFilesCache;
}

async function getUncommitedChanges(): Promise<string[]> {
  const { stdout } = await execAsync(
    `git status --porcelain -- . ':!:config/node.options' ':!config/kibana.yml'`,
    { maxBuffer: 1024 * 1024 * 128 }
  );

  return stdout
    .split('\n')
    .map((line) =>
      line
        .replace('?? ', '')
        .replace('A ', '')
        .replace('M ', '')
        .replace('D ', '')
        .replace('R ', '')
        .trim()
    );
}

export async function isTelemetrySchemaModified({ path }: { path: string }): Promise<boolean> {
  const modifiedFiles = await getUncommitedChanges();
  if (modifiedFiles.includes(path)) {
    return true;
  }

  const prChanges = await getPrChangedFiles();
  return prChanges.length >= 3000 || prChanges.includes(path);
}

export async function fetchTelemetrySchemaAtRevision({
  path,
  ref,
}: {
  path: string;
  ref: string;
}): Promise<TelemetrySchemaObject> {
  const github = getOctokit();
  const res = await github.rest.repos.getContent({
    mediaType: {
      format: 'application/vnd.github.VERSION.raw',
    },
    owner: 'elastic',
    repo: 'kibana',
    path,
    ref,
  });

  if (!Array.isArray(res.data) && res.data.type === 'file') {
    return JSON.parse(Buffer.from(res.data.content!, 'base64').toString()) as TelemetrySchemaObject;
  } else {
    throw new Error(`Error retrieving contents of ${path}, unexpected response data.`);
  }
}
