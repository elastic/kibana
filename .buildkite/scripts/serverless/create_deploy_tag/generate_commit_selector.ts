/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite, exec, SELECTED_COMMIT_META_KEY } from './shared';
import { BuildkiteInputStep } from '#pipeline-utils';

interface CommitData {
  commits: Array<{
    message: string;
    hash: string;
  }>;
  currentKibanaCommit: string;
}

async function main() {
  const [commitCount] = process.argv.slice(2);

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

async function generateCommitSelectionInput(commitData: CommitData) {
  console.log('--- Generating select step');

  const commits = commitData.commits;

  const inputStep: BuildkiteInputStep = {
    input: 'Select commit to deploy',
    prompt: 'Select commit to deploy.',
    key: 'select-commit',
    fields: [
      {
        select: 'Select commit to deploy',
        key: SELECTED_COMMIT_META_KEY,
        // TODO: Enrich this with build stats?
        options: commits.map((commit) => ({ label: commit.message, value: commit.hash })),
      },
    ],
  };

  buildkite.uploadSteps([inputStep]);
}

main()
  .then(() => {
    console.log('Commit selector generated, added as a buildkite input step.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
