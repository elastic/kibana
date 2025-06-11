/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient, BuildkiteGroup } from '#pipeline-utils';
import { expandAgentQueue } from '#pipeline-utils';

export async function pickTestGroupRunOrder() {
  const bk = new BuildkiteClient();

  // upload the step definitions to Buildkite
  const dummySteps = [];
  for (let i = 0; i < 200; i++) {
    dummySteps.push({
      label: 'Dummy bootstrap step',
      command: '.buildkite/scripts/bootstrap.sh && sleep 10',
      timeout_in_minutes: 120,
      agents: {
        ...expandAgentQueue('n2-4-spot'),
      },
      retry: {
        automatic: [{ exit_status: '*', limit: 2 }],
      },
    });
  }

  const group: BuildkiteGroup = {
    group: 'Dummy tasks',
    steps: dummySteps,
  };
  bk.uploadSteps([group]);
}

pickTestGroupRunOrder()
  .then(() => {
    console.log('Dummy tasks generated successfully.');
  })
  .catch((e) => {
    console.error('Failed to generate dummy tasks.', e);
    process.exit(1);
  });
