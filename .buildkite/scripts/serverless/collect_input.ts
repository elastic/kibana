/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { BuildkiteClient, BuildkiteInputStep } from '#pipeline-utils';

async function main() {
  const [outputPath] = process.argv.slice(2);

  console.log('--- Generating select step');

  const payload = JSON.parse(readFileSync(outputPath, 'utf-8').toString());

  const commits: Array<{ hash: string; message: string }> = payload.commits;

  const bk = new BuildkiteClient();

  const inputStep: BuildkiteInputStep = {
    label: 'Select commit to deploy',
    key: 'select-commit',
    input: {
      prompt: 'Select commit to deploy',
      fields: [
        {
          select: 'Select commit to deploy',
          key: 'commit',
          options: commits.map((commit) => ({ label: commit.message, value: commit.hash })),
        },
      ],
    },
  };

  bk.uploadSteps([inputStep]);
}

main()
  .then(() => {
    console.log('Uploded input step');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
