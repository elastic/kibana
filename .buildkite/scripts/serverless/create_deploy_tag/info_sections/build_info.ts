/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exec, octokit } from '../shared';
import { BuildkiteClient } from '#pipeline-utils';

const QA_FTR_TEST_SLUG = 'appex-qa-serverless-kibana-ftr-tests';
const KIBANA_PR_BUILD_SLUG = 'kibana-on-merge';

export interface BuildkiteBuildExtract {
  success: boolean;
  stateEmoji: string;
  url: string;
  buildNumber: number;
  slug: string;
}

export async function getOnMergePRBuild(commitHash: string): Promise<BuildkiteBuildExtract | null> {
  const commit = await octokit.request(`GET /repos/{owner}/{repo}/commits/{ref}/status`, {
    owner: 'elastic',
    repo: 'kibana',
    ref: commitHash,
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
  const buildkiteBuildNumber = Number(buildkiteURL.match(/builds\/([0-9]+)/)?.[1]);
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
    slug: KIBANA_PR_BUILD_SLUG,
    url: buildkiteURL,
    buildNumber: buildkiteBuildNumber,
  };
}

export async function getQAFTestBuilds(date: string): Promise<BuildkiteBuildExtract[]> {
  const buildkite = new BuildkiteClient({ exec });
  const pipelineSlug = QA_FTR_TEST_SLUG;
  const builds = await buildkite.getBuildsAfterDate(pipelineSlug, date, 3);
  return builds.map((build) => ({
    success: build.state === 'passed',
    stateEmoji: build.state === 'passed' ? ':white_check_mark:' : ':x:',
    url: build.web_url,
    slug: pipelineSlug,
    buildNumber: build.number,
  }));
}

export function toBuildkiteBuildInfoHtml(
  heading: string,
  buildkiteBuildInfo: BuildkiteBuildExtract | null
): string {
  if (buildkiteBuildInfo === null) {
    return `<div>[:question:] Cannot find related buildkite build</div>`;
  } else {
    const { url, stateEmoji, buildNumber } = buildkiteBuildInfo;
    return `<div>${heading}: <a href="${url}">[${stateEmoji}] ${buildkiteBuildInfo.slug}#${buildNumber}</a></div>`;
  }
}
