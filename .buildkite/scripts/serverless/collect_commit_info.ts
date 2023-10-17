/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';
import { getGithubClient } from '#pipeline-utils';

const kibanaDir = execSync('git rev-parse --show-toplevel').toString().trim();

const exec = (command: string) =>
  execSync(command, { encoding: 'utf-8', cwd: kibanaDir }).toString().trim();

const octokit = getGithubClient();

async function main() {
  const previousSha = await getCurrentQARelease();
  const previousCommit = await shaToCommit(previousSha);
  const previousCommitInfo = getReadableInfoOfCommit(previousCommit);
  await addBuildkiteInfoSection(toCommitInfoHtml('Current commit:', previousCommitInfo));

  const selectedSha = exec('buildkite-agent meta-data get "commit-sha"');
  const selectedCommit = await shaToCommit(selectedSha);
  const selectedCommitInfo = getReadableInfoOfCommit(selectedCommit);
  await addBuildkiteInfoSection(toCommitInfoHtml('Target commit:', selectedCommitInfo));

  const { url: selectedBuildUrl, buildNumber: selectedBuildNumber } = await getBuildkiteBuild(
    selectedSha
  );
  await addBuildkiteInfoSection(
    `<div><a href="${selectedBuildUrl}">Buildkite build #${selectedBuildNumber} </a></div>`
  );
}

async function getCurrentQARelease() {
  const releasesFile = await octokit.request(`GET /repos/{owner}/{repo}/contents/{path}`, {
    owner: 'elastic',
    repo: 'serverless-gitops',
    path: 'services/kibana/versions.yaml',
  });

  const fileContent = Buffer.from(releasesFile.data.content, 'base64').toString('utf8');

  const sha = fileContent.match(`qa: "([a-z0-9]+)"`)?.[1];

  if (!sha) {
    throw new Error('Could not find QA hash in current releases file');
  } else {
    return sha;
  }
}

async function shaToCommit(sha: string): Promise<Octokit.ReposGetCommitResponse> {
  const commit = await octokit.repos.getCommit({
    owner: 'elastic',
    repo: 'kibana',
    ref: sha,
  });

  return commit.data;
}

function getReadableInfoOfCommit(commit: Octokit.ReposGetCommitResponse) {
  return {
    sha: commit.sha,
    message: commit.commit.message,
    date: commit.commit.author.date,
    author: commit.author?.login,
    title: commit.commit.message.split('\n')[0],
    link: commit.html_url,
  };
}

async function getBuildkiteBuild(commitSha: string) {
  const commit = await octokit.request(`GET /repos/{owner}/{repo}/commits/{ref}/status`, {
    owner: 'elastic',
    repo: 'kibana',
    ref: commitSha,
    headers: {
      accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const buildkiteURL = commit.data.statuses.find(
    (e: { context: string; target_url: string }) =>
      e.context === 'buildkite/on-merge' && e.target_url
  ).target_url;

  const buildkiteBuildNumber = buildkiteURL.match(/builds\/([0-9]+)/)?.[1];

  return {
    url: buildkiteURL,
    buildNumber: buildkiteBuildNumber,
  };
}

async function addBuildkiteInfoSection(html: string) {
  execSync(`buildkite-agent annotate --append --style 'info' --context 'commit-info'`, {
    input: html,
  });
}

function toCommitInfoHtml(
  sectionTitle: string,
  commitInfo: {
    sha: string;
    message: string;
    date: string;
    author: string;
    title: string;
    link: string;
  }
): string {
  return `<div>
<div><h3>${sectionTitle}</h3></div>
<div><a href="${commitInfo.link}">${commitInfo.sha}</a> by ${commitInfo.author} on ${commitInfo.date}</div>
<div><small>(${commitInfo.title})</small></div>
</div>`;
}

main();
