/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types';
import * as path from 'path';
import { getExec } from './prepared_exec';
import { getGithubClient, BuildkiteClient, getKibanaDir } from '#pipeline-utils';

const KIBANA_PR_BASE = 'https://github.com/elastic/kibana/pulls';

const octokit = getGithubClient();

const exec = getExec(!process.env.CI);

async function main() {
  // Current commit info
  const previousSha = await getCurrentQARelease();
  const previousCommit = await shaToCommit(previousSha);
  const previousCommitInfo = getReadableInfoOfCommit(previousCommit);
  await addBuildkiteInfoSection(toCommitInfoHtml('Current commit:', previousCommitInfo));

  // Target commit info
  const selectedSha = exec('buildkite-agent meta-data get "commit-sha"');
  if (!selectedSha) {
    throw new Error(`Could not find selected commit (by 'commit-sha' in buildkite meta-data)`);
  }
  const selectedCommit = await shaToCommit(selectedSha);
  const selectedCommitInfo = getReadableInfoOfCommit(selectedCommit);
  await addBuildkiteInfoSection(toCommitInfoHtml('Target commit:', selectedCommitInfo));

  // Buildkite build info
  const buildkiteBuild = await getBuildkiteBuild(selectedSha);
  await addBuildkiteInfoSection(toBuildkiteBuildInfoHtml(buildkiteBuild));

  // Save Object migration comparison
  const comparisonResult = compareSOSnapshots(previousSha, selectedSha);
  await addBuildkiteInfoSection(toSOComparisonBlockHtml(comparisonResult));

  if (!process.env.CI) {
    // @ts-ignore
    console.log(exec.calls);
  }
}

async function getCurrentQARelease() {
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

type GithubCommitType = RestEndpointMethodTypes['repos']['getCommit']['response']['data'];

async function shaToCommit(sha: string): Promise<GithubCommitType> {
  const commit = await octokit.repos.getCommit({
    owner: 'elastic',
    repo: 'kibana',
    ref: sha,
  });

  return commit.data;
}

function getReadableInfoOfCommit(commit: GithubCommitType) {
  return {
    sha: commit.sha,
    message: commit.commit.message,
    date: commit.commit.author?.date,
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
  const buildkiteStatus = commit.data.statuses.find(
    (e: { context: string; target_url: string }) =>
      e.context === 'buildkite/on-merge' && e.target_url
  );

  if (!buildkiteStatus) {
    return null;
  }

  const buildkiteURL = buildkiteStatus.target_url;
  const buildkiteBuildNumber = buildkiteURL.match(/builds\/([0-9]+)/)?.[1];
  const state = buildkiteStatus.state as 'failure' | 'pending' | 'success';
  const stateEmoji =
    {
      failure: ':x:',
      pending: ':hourglass:',
      success: ':white_check_mark:',
    }[state] || ':question:';

  return {
    success: state === 'success',
    stateEmoji,
    url: buildkiteURL,
    buildNumber: buildkiteBuildNumber,
  };
}

async function addBuildkiteInfoSection(html: string) {
  exec(`buildkite-agent annotate --append --style 'info' --context 'commit-info'`, {
    input: html + '<br />',
  });
}

function compareSOSnapshots(previousSha: string, selectedSha: string) {
  const command = `node scripts/snapshot_plugin_types compare --from ${previousSha} --to ${selectedSha}`;
  const outputPath = path.resolve(getKibanaDir(), 'so_comparison.json');
  exec(`${command} --outputPath ${outputPath}`, { stdio: 'inherit' });

  const soComparisonResult = JSON.parse(readFileSync(outputPath).toString());

  const buildkite = new BuildkiteClient({ exec });
  buildkite.uploadArtifacts(outputPath);

  return {
    hasChanges: soComparisonResult.hasChanges,
    changed: soComparisonResult.changed,
    command,
  };
}

function toCommitInfoHtml(
  sectionTitle: string,
  commitInfo: {
    sha: string;
    message: string;
    date: string | undefined;
    author: string | undefined;
    title: string;
    link: string;
  }
): string {
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

function toBuildkiteBuildInfoHtml(
  buildkiteBuildInfo: Awaited<ReturnType<typeof getBuildkiteBuild>>
): string {
  if (buildkiteBuildInfo === null) {
    return `<div>[:question:] Cannot find related buildkite build</div>`;
  } else {
    const { url, stateEmoji, buildNumber } = buildkiteBuildInfo;
    return `<div>
<a href="${url}">[${stateEmoji}] Buildkite build #${buildNumber}</a>
</div>`;
  }
}

function toSOComparisonBlockHtml(comparisonResult: {
  hasChanges: any;
  changed: any;
  command: string;
}): string {
  return `<div>
<h4>Plugin Saved Object migration changes: ${comparisonResult.hasChanges}</h4>
<div>Changed plugins: ${comparisonResult.changed.join(', ')}</div>
<i>Find detailed info in the archived artifacts, or run the command yourself: </i>
<div><pre>${comparisonResult.command}</pre></div>
</div>`;
}

main();
