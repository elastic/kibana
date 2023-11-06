/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite, buildkiteBuildStateToEmoji, buildStateToEmoji, octokit } from '../shared';
import { CommitWithStatuses } from '../generate_commit_selector';

const QA_FTR_TEST_SLUG = 'appex-qa-serverless-kibana-ftr-tests';
const KIBANA_ARTIFACT_BUILD_SLUG = 'kibana-artifacts-container-image';
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
  const stateEmoji = buildStateToEmoji(state);

  return {
    success: state === 'success',
    stateEmoji,
    slug: KIBANA_PR_BUILD_SLUG,
    url: buildkiteURL,
    buildNumber: buildkiteBuildNumber,
  };
}

export async function getQAFTestBuilds(date: string): Promise<BuildkiteBuildExtract[]> {
  const builds = await buildkite.getBuildsAfterDate(QA_FTR_TEST_SLUG, date, 10);

  return builds
    .map((build) => ({
      success: build.state === 'passed',
      stateEmoji: buildkiteBuildStateToEmoji(build.state),
      url: build.web_url,
      slug: QA_FTR_TEST_SLUG,
      buildNumber: build.number,
    }))
    .reverse();
}

export async function getArtifactBuildJob(
  commitHash: string
): Promise<BuildkiteBuildExtract | null> {
  const build = await buildkite.getBuildForCommit(KIBANA_ARTIFACT_BUILD_SLUG, commitHash);

  if (!build) {
    return null;
  }

  return {
    success: build.state === 'passed',
    stateEmoji: buildkiteBuildStateToEmoji(build.state),
    url: build.web_url,
    slug: KIBANA_ARTIFACT_BUILD_SLUG,
    buildNumber: build.number,
  };
}

export function toBuildkiteBuildInfoHtml(
  heading: string,
  builds: Record<string, BuildkiteBuildExtract | null>
): string {
  let html = `<div><h4>${heading}</h4>`;
  for (const [name, build] of Object.entries(builds)) {
    if (!build) {
      html += `<div>[:question:] ${name}: No build found</div>`;
    } else {
      const { url, stateEmoji, buildNumber, slug } = build;
      html += `<div>[${stateEmoji}] ${name}: <a href="${url}">${slug}#${buildNumber}</a></div>`;
    }
  }
  html += '</div>';

  return html;
}

export function toCommitInfoWithBuildResults(commits: CommitWithStatuses[]) {
  const commitWithBuildResultsHtml = commits.map((commitInfo) => {
    const checks = commitInfo.checks;
    const prBuildSnippet = getBuildInfoSnippet('on merge', checks.onMergeBuild);
    const ftrBuildSnippet = getBuildInfoSnippet('ftr tests', checks.ftrBuild);
    const artifactBuildSnippet = getBuildInfoSnippet('artifact build', checks.artifactBuild);
    const titleWithLink = commitInfo.title.replace(
      /#(\d{4,6})/,
      `<a href="${commitInfo.prLink}">$&</a>`
    );

    return `<div>
  <div>
      <strong><a href="${commitInfo.link}">${commitInfo.sha}</a></strong> | [${prBuildSnippet}][${ftrBuildSnippet}][${artifactBuildSnippet}]
  </div>
  <div>
      <strong>${titleWithLink}</strong><i> by ${commitInfo.author} on ${commitInfo.date}</i>
  </div>
  <hr />
</div>`;
  });

  return commitWithBuildResultsHtml.join('\n');
}

function getBuildInfoSnippet(name: string, build: BuildkiteBuildExtract | null) {
  if (!build) {
    return `[❓] ${name}`;
  } else {
    return `${build.stateEmoji} <a href="${build.url}">${name}</a>`;
  }
}
