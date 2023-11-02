/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite, buildStateToEmoji, exec, octokit, SELECTED_COMMIT_META_KEY } from './shared';
import { BuildkiteInputStep } from '#pipeline-utils';

interface Commit {
  message: string;
  hash: string;
}

interface CommitData {
  commits: Commit[];
  currentKibanaCommit: string;
}

async function main(commitCount: string) {
  const commitData = await collectAvailableCommits(commitCount);

  await generateCommitSelectionInput(commitData);
}

async function collectAvailableCommits(commitCount: string): Promise<CommitData> {
  console.log('--- Collecting recent kibana commits');

  const currentKibanaCommit = exec('git rev-parse HEAD')!;
  const kibanaCommits = exec(`git log --pretty=format:"%s<@>%H" -n ${commitCount}`);

  if (!kibanaCommits) {
    throw new Error('Could not find any, while listing recent commits');
  }

  const kibanaCommitList = kibanaCommits.split('\n').map((commit) => {
    const [message, hash] = commit.split('<@>');
    return { message, hash };
  });

  return {
    commits: kibanaCommitList,
    currentKibanaCommit,
  };
}

async function enrichWithStatuses(commits: Commit[]): Promise<Commit[]> {
  console.log('--- Enriching with build statuses');

  const commitsWithStatuses = await Promise.all(
    commits.map(async (commit) => {
      const statusesResponse = await octokit.request(
        `GET /repos/{owner}/{repo}/commits/{ref}/status`,
        {
          owner: 'elastic',
          repo: 'kibana',
          ref: commit.hash,
        }
      );

      const combinedState = statusesResponse.data.state;
      const emoji = buildStateToEmoji(combinedState);

      return {
        message: `${emoji} ${commit.message}`,
        hash: commit.hash,
      };
    })
  );

  return commitsWithStatuses;
}

async function generateCommitSelectionInput(commitData: CommitData) {
  console.log('--- Generating select step');

  const commits = commitData.commits;
  const commitsWithStatuses = await enrichWithStatuses(commits);

  const inputStep: BuildkiteInputStep = {
    input: 'Select commit to deploy',
    prompt: 'Select commit to deploy.',
    key: 'select-commit',
    fields: [
      {
        select: 'Select commit to deploy',
        key: SELECTED_COMMIT_META_KEY,
        options: commitsWithStatuses.map((commit) => ({
          label: commit.message,
          value: commit.hash,
        })),
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
