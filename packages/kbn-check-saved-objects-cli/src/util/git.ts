/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';

import { Octokit } from '@octokit/rest';

let octokit: null | Octokit;

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

/**
 * Expands a short git ref (branch name, tag, relative ref like HEAD~1) to a full 40-character
 * commit hash. If the input is already a full hash, it is returned unchanged.
 */
export const expandGitRev = (gitRev: string): string => {
  if (/^[0-9a-f]{40}$/.test(gitRev)) {
    return gitRev;
  }
  try {
    return execSync(`git rev-parse ${gitRev}`, { stdio: ['pipe', 'pipe', null] })
      .toString()
      .trim();
  } catch (err) {
    throw new Error(`Couldn't expand git rev: ${gitRev} - ${err.message}`);
  }
};

export async function getFileFromKibanaRepo({ path, ref }: { path: string; ref: string }) {
  const github = getOctokit();

  const res = await github.repos.getContent({
    owner: 'elastic',
    repo: 'kibana',
    path,
    ref,
    mediaType: {
      format: 'application/vnd.github.VERSION.raw',
    },
  });

  if (!Array.isArray(res.data) && res.data.type === 'file') {
    return JSON.parse(Buffer.from(res.data.content!, 'base64').toString());
  } else {
    throw new Error(`Error retrieving contents of ${path}, unexpected response data.`);
  }
}
