/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite, buildkiteBuildStateToEmoji, CommitWithStatuses } from '../shared';
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
  kibanaCommit: string;
}

export async function getOnMergePRBuild(commitSha: string): Promise<BuildkiteBuildExtract | null> {
  const buildkiteBuild = await buildkite.getBuildForCommit(KIBANA_PR_BUILD_SLUG, commitSha);

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
    commit: commitSha,
    kibanaCommit: buildkiteBuild.commit,
    startedAt: buildkiteBuild.started_at,
    finishedAt: buildkiteBuild.finished_at,
  };
}

export async function getArtifactBuild(commitSha: string): Promise<BuildkiteBuildExtract | null> {
  const build = await buildkite.getBuildForCommit(KIBANA_ARTIFACT_BUILD_SLUG, commitSha);

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
    kibanaCommit: build.commit,
    startedAt: build.started_at,
    finishedAt: build.finished_at,
  };
}

export async function getQAFBuildContainingCommit(
  commitSha: string,
  date: string,
  recentGitCommits: GitCommitExtract[]
): Promise<BuildkiteBuildExtract | null> {
  // List of QAF builds
  const qafBuilds = await buildkite.getBuildsAfterDate(QA_FTR_TEST_SLUG, date, 30);
  qafBuilds.reverse();

  // Find the first build that contains this commit
  const build = qafBuilds
    // Only search across scheduled builds, triggered builds might run with different commits
    .filter((e) => e.source === 'schedule')
    .find((kbBuild) => {
      const commitShaIndex = recentGitCommits.findIndex((c) => c.sha === commitSha);

      const kibanaCommitOfFTR = tryGetKibanaBuildHashFromQAFBuild(kbBuild);
      const buildkiteBuildShaIndex = recentGitCommits.findIndex((c) => c.sha === kibanaCommitOfFTR);

      // Check if build.commit is after commitSha?
      return (
        commitShaIndex !== -1 &&
        buildkiteBuildShaIndex !== -1 &&
        buildkiteBuildShaIndex <= commitShaIndex
      );
    });

  if (!build) {
    return null;
  }

  return {
    success: build.state === 'passed',
    stateEmoji: buildkiteBuildStateToEmoji(build.state),
    url: build.web_url,
    slug: QA_FTR_TEST_SLUG,
    buildNumber: build.number,
    commit: build.commit,
    kibanaCommit: tryGetKibanaBuildHashFromQAFBuild(build),
    startedAt: build.started_at,
    finishedAt: build.finished_at,
  };
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

function makeBuildInfoSnippetHtml(name: string, build: BuildkiteBuildExtract | null) {
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

export function makeBuildkiteBuildInfoHtml(
  heading: string,
  builds: Record<string, BuildkiteBuildExtract | null>
): string {
  let html = `<div><h4>${heading}</h4>`;
  for (const [name, build] of Object.entries(builds)) {
    html += `<div> | ${makeBuildInfoSnippetHtml(name, build)}</div>\n`;
  }
  html += '</div>';

  return html;
}

export function makeCommitInfoWithBuildResultsHtml(commits: CommitWithStatuses[]) {
  const commitWithBuildResultsHtml = commits.map((commitInfo) => {
    const checks = commitInfo.checks;
    const prBuildSnippet = makeBuildInfoSnippetHtml('on merge job', checks.onMergeBuild);
    const ftrBuildSnippet = makeBuildInfoSnippetHtml('qaf/ftr tests', checks.ftrBuild);
    const artifactBuildSnippet = makeBuildInfoSnippetHtml('artifact build', checks.artifactBuild);
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
