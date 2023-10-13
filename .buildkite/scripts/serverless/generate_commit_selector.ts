/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';
import { BuildkiteClient, BuildkiteInputStep } from '#pipeline-utils';

interface CommitData {
  commits: Array<{
    message: string;
    hash: string;
  }>;
  currentKibanaCommit: string;
}

async function main() {
  const [outputPath, commitCount] = process.argv.slice(2);

  const commitData = await collectAvailableCommits(commitCount);

  writeFileSync(path.resolve(outputPath), JSON.stringify(commitData, null, 2));

  await generateCommitSelectionInput(commitData);
}

async function collectAvailableCommits(commitCount: string): Promise<CommitData> {
  console.log('--- Collecting recent kibana commits');

  const kibanaDir = execSync('git rev-parse --show-toplevel').toString().trim();
  const exec = (command: string) =>
    execSync(command, { encoding: 'utf-8', cwd: kibanaDir }).toString().trim();

  const currentKibanaCommit = exec('git rev-parse HEAD');
  const kibanaCommits = exec(`git log --pretty=format:"%s<@>%H" -n ${commitCount}`);

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

  const bk = new BuildkiteClient();
  const inputStep: BuildkiteInputStep = {
    input: 'Select commit to deploy',
    prompt: 'Select commit to deploy.',
    key: 'select-commit',
    fields: [
      {
        select: 'Select commit to deploy',
        key: 'commit-sha',
        // TODO: Enrich this with build stats?
        options: commits.map((commit) => ({ label: commit.message, value: commit.hash })),
      },
    ],
  };

  bk.uploadSteps([inputStep]);
}

main()
  .then(() => {
    console.log('Uploded input step.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
