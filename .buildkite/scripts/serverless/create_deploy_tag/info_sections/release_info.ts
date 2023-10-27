/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types';
import { exec, octokit, SELECTED_COMMIT_META_KEY } from '../shared';

type GithubCommitType = RestEndpointMethodTypes['repos']['getCommit']['response']['data'];

const KIBANA_PR_BASE = 'https://github.com/elastic/kibana/pulls';

export interface GitCommitExtract {
  date: string | undefined;
  author: string | undefined;
  link: string;
  message: string;
  title: string;
  sha: string;
}

export async function getCurrentQARelease() {
  const releasesFile = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
    owner: 'elastic',
    repo: 'serverless-gitops',
    path: 'services/kibana/versions.yaml',
  });

  // @ts-ignore
  const fileContent = Buffer.from(releasesFile.data.content, 'base64').toString('utf8');

  const sha = fileContent.match(`qa: "([a-z0-9]+)"`)?.[1];

  if (!sha) {
    throw new Error('Could not find QA hash in current releases file');
  } else {
    return sha;
  }
}

export function getSelectedCommitHash() {
  const commitHash = exec(`buildkite-agent meta-data get "${SELECTED_COMMIT_META_KEY}"`);
  if (!commitHash) {
    throw new Error(
      `Could not find selected commit (by '${SELECTED_COMMIT_META_KEY}' in buildkite meta-data)`
    );
  }
  return commitHash;
}

export async function hashToCommit(hash: string): Promise<GithubCommitType> {
  const commit = await octokit.repos.getCommit({
    owner: 'elastic',
    repo: 'kibana',
    ref: hash,
  });

  return commit.data;
}

export function getCommitExtract(commit: GithubCommitType): GitCommitExtract {
  return {
    sha: commit.sha,
    message: commit.commit.message,
    date: commit.commit.author?.date,
    author: commit.author?.login,
    title: commit.commit.message.split('\n')[0],
    link: commit.html_url,
  };
}

export function toCommitInfoHtml(sectionTitle: string, commitInfo: GitCommitExtract): string {
  const titleWithLink = commitInfo.title.replace(
    /#(\d{4,6})/,
    `<a href="${KIBANA_PR_BASE}/$1">$&</a>`
  );

  return `<div>
<div><h4>${sectionTitle}</h4></div>
<div><a href="${commitInfo.link}">${commitInfo.sha}</a> by ${commitInfo.author} on ${commitInfo.date}</div>
<div><small>:merged-pr: ${titleWithLink}</small></div>
</div>`;
}
