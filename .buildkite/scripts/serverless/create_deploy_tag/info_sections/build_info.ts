/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite, buildkiteBuildStateToEmoji, CommitWithStatuses, octokit } from '../shared';
import { GitCommitExtract } from './commit_info';
import { Build } from '#pipeline-utils/buildkite';

const QA_FTR_TEST_SLUG = 'appex-qa-serverless-kibana-ftr-tests';
const KIBANA_ARTIFACT_BUILD_SLUG = 'kibana-artifacts-container-image';
const KIBANA_PR_BUILD_SLUG = 'kibana-on-merge';

export interface BuildkiteBuildExtract {
  success: boolean;
  stateEmoji: string;
  url: string;
  buildNumber: number;
  slug: string;
  commit: string;
  startedAt: string;
  finishedAt: string;
}

export async function getOnMergePRBuild(commitHash: string): Promise<BuildkiteBuildExtract | null> {
  const buildkiteBuild = await buildkite.getBuildForCommit(KIBANA_PR_BUILD_SLUG, commitHash);

  if (!buildkiteBuild) {
    return null;
  }

  const stateEmoji = buildkiteBuildStateToEmoji(buildkiteBuild.state);

  return {
    success: buildkiteBuild.state === 'passed',
    stateEmoji,
    slug: KIBANA_PR_BUILD_SLUG,
    url: buildkiteBuild.web_url,
    buildNumber: buildkiteBuild.number,
    commit: commitHash,
    startedAt: buildkiteBuild.started_at,
    finishedAt: buildkiteBuild.finished_at,
  };
}

export async function getQAFTestBuilds(date: string): Promise<BuildkiteBuildExtract[]> {
  const builds = await buildkite.getBuildsAfterDate(QA_FTR_TEST_SLUG, date, 10);

  return builds
    .map((build) => {
      const kibanaBuildHash = tryGetKibanaBuildHashFromQAFBuild(build);

      return {
        success: build.state === 'passed',
        stateEmoji: buildkiteBuildStateToEmoji(build.state),
        url: build.web_url,
        slug: QA_FTR_TEST_SLUG,
        buildNumber: build.number,
        commit: kibanaBuildHash || build.commit,
        startedAt: build.started_at,
        finishedAt: build.finished_at,
      };
    })
    .reverse();
}

function tryGetKibanaBuildHashFromQAFBuild(build: Build) {
  try {
    const metaDataKeys = Object.keys(build.meta_data || {});
    const anyKibanaProjectKey =
      metaDataKeys.find((key) => key.startsWith('project::bk-serverless')) || 'missing';
    const kibanaBuildInfo = JSON.parse(build.meta_data[anyKibanaProjectKey]);
    return kibanaBuildInfo?.kibana_build_hash;
  } catch (e) {
    console.error(e);
    return null;
  }
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
    commit: build.commit,
    startedAt: build.started_at,
    finishedAt: build.finished_at,
  };
}

export async function getQAFBuildContainingCommit(
  commitSha: string,
  qafBuilds: BuildkiteBuildExtract[],
  commits: GitCommitExtract[] = []
): Promise<BuildkiteBuildExtract | null> {
  const commitShaList = commits.length
    ? commits.map((e) => e.sha)
    : (
        await octokit.request('GET /repos/{owner}/{repo}/commits/', {
          owner: 'elastic',
          repo: 'kibana',
          ref: 'main',
          headers: {
            accept: 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
      ).data.map((e: { sha: string }) => e.sha);

  console.log(
    `Trying to find QAF build containing commit ${commitSha} in list of commits: ${commitShaList}`
  );

  const build = qafBuilds.find((kbBuild) => {
    // Check if build.commit is after commitSha?
    const buildkiteBuildShaIndex = commitShaList.findIndex((c: string) => c === kbBuild.commit);
    const commitShaIndex = commitShaList.findIndex((c: string) => c === commitSha);

    console.log({ buildkiteBuildShaIndex, commitShaIndex, kbCommit: kbBuild.commit });
    return (
      commitShaIndex !== -1 &&
      buildkiteBuildShaIndex !== -1 &&
      buildkiteBuildShaIndex < commitShaIndex
    );
  });

  if (!build) {
    return null;
  }

  return {
    success: build.success,
    stateEmoji: build.stateEmoji,
    url: build.url,
    slug: build.slug,
    buildNumber: build.buildNumber,
    commit: build.commit,
    startedAt: build.startedAt,
    finishedAt: build.finishedAt,
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
    const prBuildSnippet = getBuildInfoSnippet('on merge job', checks.onMergeBuild);
    const ftrBuildSnippet = getBuildInfoSnippet('qaf/ftr tests', checks.ftrBuild);
    const artifactBuildSnippet = getBuildInfoSnippet('artifact build', checks.artifactBuild);
    const titleWithLink = commitInfo.title.replace(
      /#(\d{4,6})/,
      `<a href="${commitInfo.prLink}">$&</a>`
    );

    return `<div>
  <div>
      <div><strong><a href="${commitInfo.link}">${commitInfo.sha}</a></strong></div>
      <div><strong>${titleWithLink}</strong><i> by ${commitInfo.author} on ${commitInfo.date}</i></div>
      <div>| ${prBuildSnippet}</div>
      <div>| ${artifactBuildSnippet}</div>
      <div>| ${ftrBuildSnippet}</div>
  </div>
  <hr />
</div>`;
  });

  return commitWithBuildResultsHtml.join('\n');
}

function getBuildInfoSnippet(name: string, build: BuildkiteBuildExtract | null) {
  if (!build) {
    return `[❓] ${name} - no build found`;
  } else {
    const statedAt = build.startedAt
      ? `started at <strong>${new Date(build.startedAt).toUTCString()}</strong>`
      : 'not started yet';
    const finishedAt = build.finishedAt
      ? `finished at <strong>${new Date(build.finishedAt).toUTCString()}</strong>`
      : 'not finished yet';
    return `[${build.stateEmoji}] <a href="${build.url}">${name} #${build.buildNumber}</a> - ${statedAt}, ${finishedAt}`;
  }
}
