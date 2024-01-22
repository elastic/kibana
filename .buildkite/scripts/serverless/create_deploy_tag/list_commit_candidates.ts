/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite, COMMIT_INFO_CTX, CommitWithStatuses, SELECTED_COMMIT_META_KEY } from './shared';
import {
  getArtifactBuild,
  getOnMergePRBuild,
  getQAFBuildContainingCommit,
  makeCommitInfoWithBuildResultsHtml,
} from './info_sections/build_info';
import { getRecentCommits, GitCommitExtract } from './info_sections/commit_info';
import { BuildkiteInputStep } from '#pipeline-utils';

async function main(commitCountArg: string) {
  console.log('--- Listing commits');
  const commitCount = parseInt(commitCountArg, 10);
  const commitData = await collectAvailableCommits(commitCount);
  const commitsWithStatuses = await enrichWithStatuses(commitData);

  console.log('--- Updating buildkite context with listed commits');
  const commitListWithBuildResultsHtml = makeCommitInfoWithBuildResultsHtml(commitsWithStatuses);
  buildkite.setAnnotation(COMMIT_INFO_CTX, 'info', commitListWithBuildResultsHtml);

  if (process.env.AUTO_SELECT_COMMIT?.match(/(1|true)/i)) {
    console.log('--- Finding suitable candidate for auto-promotion');

    const passingCommitCandidate = commitsWithStatuses.find((commit) => {
      return (
        commit.checks.onMergeBuild?.success &&
        commit.checks.ftrBuild?.success &&
        commit.checks.artifactBuild?.success
      );
    });

    if (!passingCommitCandidate) {
      throw new Error(
        `Could not find a suitable candidate for auto-promotion in the last ${commitCount} commits. Stopping.`
      );
    }

    console.log('Selected candidate: ', passingCommitCandidate);

    console.log('--- Setting buildkite meta-data for auto-promotion');
    buildkite.setMetadata(SELECTED_COMMIT_META_KEY, passingCommitCandidate.sha);
  } else {
    console.log('--- Generating buildkite input step');
    addBuildkiteInputStep();
  }
}

async function collectAvailableCommits(commitCount: number): Promise<GitCommitExtract[]> {
  console.log('--- Collecting recent kibana commits');

  const recentCommits = await getRecentCommits(commitCount);

  if (!recentCommits) {
    throw new Error('Could not find any, while listing recent commits');
  }

  return recentCommits;
}

async function enrichWithStatuses(commits: GitCommitExtract[]): Promise<CommitWithStatuses[]> {
  console.log('--- Enriching with build statuses');

  const commitsWithStatuses: CommitWithStatuses[] = await Promise.all(
    commits.map(async (commit) => {
      const onMergeBuild = await getOnMergePRBuild(commit.sha);

      if (!commit.date) {
        return {
          ...commit,
          checks: {
            onMergeBuild,
            ftrBuild: null,
            artifactBuild: null,
          },
        };
      }

      const nextFTRBuild = await getQAFBuildContainingCommit(commit.sha, commit.date, commits);
      const artifactBuild = await getArtifactBuild(commit.sha);

      return {
        ...commit,
        checks: {
          onMergeBuild,
          ftrBuild: nextFTRBuild,
          artifactBuild,
        },
      };
    })
  );

  return commitsWithStatuses;
}

function addBuildkiteInputStep() {
  const inputStep: BuildkiteInputStep = {
    input: 'Select commit to deploy',
    prompt: 'Select commit to deploy.',
    key: 'select-commit',
    fields: [
      {
        text: 'Enter the selected commit SHA',
        key: SELECTED_COMMIT_META_KEY,
      },
    ],
  };

  buildkite.uploadSteps([inputStep]);
}

main(process.argv[2])
  .then(() => {
    console.log('Commit selector generated, added as a buildkite input step.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
