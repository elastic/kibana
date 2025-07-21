/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { Octokit } from '@octokit/rest';

export async function getCurrentQARelease({ log }: { log: ToolingLog }) {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('Missing environment variable: GITHUB_TOKEN');
  }
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  log.info(
    `🌐 GET https://github.com/elastic/serverless-gitops/blob/main/services/kibana/versions.yaml`
  );
  const releasesFile = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
    owner: 'elastic',
    repo: 'serverless-gitops',
    path: 'services/kibana/versions.yaml',
  });

  // @ts-ignore
  const fileContent = Buffer.from(releasesFile.data.content, 'base64').toString('utf8');

  const sha = fileContent.match(`qa-ds-1: "([a-z0-9]+)"`)?.[1];

  log.info(`✅ Current QA release: ${sha}`);

  if (!sha) {
    throw new Error('Could not find QA hash in current releases file');
  } else {
    return sha;
  }
}
