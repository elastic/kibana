/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExec } from '../create_deploy_tag/mock_exec';
import { BuildkiteClient, BuildkiteInputStep, getGithubClient } from '#pipeline-utils';

const SELECTED_COMMIT_META_KEY = 'selected-commit';

const buildkite = new BuildkiteClient({ exec: getExec(!process.env.CI) });
const octokit = getGithubClient();

async function getCurrentProdReleaseSha() {
  const releasesFile = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
    owner: 'elastic',
    repo: 'serverless-gitops',
    path: 'services/kibana/versions.yaml',
  });

  // @ts-ignore
  const fileContent = Buffer.from(releasesFile.data.content, 'base64').toString('utf8');

  const sha = fileContent.match(`production-canary-ds-1: "([a-z0-9]+)"`)?.[1];

  if (!sha) {
    throw new Error('Could not find QA hash in current releases file');
  } else {
    return sha;
  }
}

async function main() {
  const sha = await getCurrentProdReleaseSha();
  const inputStep: BuildkiteInputStep = {
    input: 'Select commit to deploy',
    prompt: 'Select commit to deploy.',
    key: 'select-commit',
    fields: [
      {
        text: 'Enter Kibana SHA for the docs to deploy (likely you want the default)',
        key: SELECTED_COMMIT_META_KEY,
        default: sha,
      },
    ],
  };

  buildkite.uploadSteps([inputStep]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
