/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { run } from '@kbn/dev-cli-runner';
import { Octokit } from '@octokit/rest';

async function getServerlessReleaseSha(): Promise<string> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('Missing environment variable: GITHUB_TOKEN');
  }
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const releasesFile = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
    owner: 'elastic',
    repo: 'serverless-gitops',
    path: 'services/kibana/versions.yaml',
  });

  const fileContent = Buffer.from((releasesFile.data as any).content, 'base64').toString('utf8');
  const sha = fileContent.match(`qa-ds-1: "([a-z0-9]+)"`)?.[1];
  if (sha) {
    return sha;
  } else {
    throw new Error('Cannot find QA field (qa-ds-1) in versions.yaml');
  }
}

run(async ({ log }) => log.write(await getServerlessReleaseSha()));
