/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types';
import { buildkite, octokit, SELECTED_COMMIT_META_KEY, CURRENT_COMMIT_META_KEY } from '../shared';

export type GithubCommitType = RestEndpointMethodTypes['repos']['getCommit']['response']['data'];
export type ListedGithubCommitType =
  RestEndpointMethodTypes['repos']['listCommits']['response']['data'][0];

const KIBANA_PR_BASE = 'https://github.com/elastic/kibana/pull';

export interface GitCommitExtract {
  sha: string;
  title: string;
  message: string;
  link: string;
  date: string | undefined;
  author: string | undefined;
  prLink: string | undefined;
}

export async function getCurrentQARelease() {
  const releasesFile = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
    owner: 'elastic',
    repo: 'serverless-gitops',
    path: 'services/kibana/versions.yaml',
  });

  // @ts-ignore
  const fileContent = Buffer.from(releasesFile.data.content, 'base64').toString('utf8');

  const sha = fileContent.match(`qa-ds-1: "([a-z0-9]+)"`)?.[1];

  if (!sha) {
    throw new Error('Could not find QA hash in current releases file');
  } else {
    buildkite.setMetadata(CURRENT_COMMIT_META_KEY, sha);
    return sha;
  }
}

export function getSelectedCommitHash() {
  const commitHash = buildkite.getMetadata(SELECTED_COMMIT_META_KEY);
  if (!commitHash) {
    throw new Error(
      `Could not find selected commit (by '${SELECTED_COMMIT_META_KEY}' in buildkite meta-data)`
    );
  }
  return commitHash;
}

export async function getCommitByHash(hash: string): Promise<GithubCommitType> {
  const commit = await octokit.repos.getCommit({
    owner: 'elastic',
    repo: 'kibana',
    ref: hash,
  });

  return commit.data;
}

export async function getRecentCommits(commitCount: number): Promise<GitCommitExtract[]> {
  const kibanaCommits: ListedGithubCommitType[] = (
    await octokit.repos.listCommits({
      owner: 'elastic',
      repo: 'kibana',
      per_page: Number(commitCount),
    })
  ).data;

  return kibanaCommits.map(toGitCommitExtract);
}

export function toGitCommitExtract(
  commit: GithubCommitType | ListedGithubCommitType
): GitCommitExtract {
  const title = commit.commit.message.split('\n')[0];
  const prNumber = title.match(/#(\d{4,6})/)?.[1];
  const prLink = prNumber ? `${KIBANA_PR_BASE}/${prNumber}` : undefined;

  return {
    sha: commit.sha,
    message: commit.commit.message,
    title,
    link: commit.html_url,
    date: commit.commit.author?.date || commit.commit.committer?.date,
    author: commit.author?.login || commit.committer?.login,
    prLink,
  };
}

export function makeCommitInfoHtml(sectionTitle: string, commitInfo: GitCommitExtract): string {
  const titleWithLink = commitInfo.title.replace(
    /#(\d{4,6})/,
    `<a href="${commitInfo.prLink}">$&</a>`
  );

  const commitDateUTC = new Date(commitInfo.date!).toUTCString();

  return `<div>
<div><h4>${sectionTitle}</h4></div>
<div><a href="${commitInfo.link}">
${commitInfo.sha}</a>
 by <strong>${commitInfo.author}</strong>
 on <strong>${commitDateUTC}</strong>
</div>
<div><small>:merged-pr: ${titleWithLink}</small></div>
</div>`;
}
