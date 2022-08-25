/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Fs from 'fs';

import { BuildkiteClient } from '../buildkite';

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing required environment variable "${name}"`);
  }
  return value;
};

export async function pickTestGroupRunOrder() {
  const bk = new BuildkiteClient();

  // write the config for each step to an artifact that can be used by the individual jest jobs
  Fs.writeFileSync(
    'jest_run_order.json',
    JSON.stringify(
      {
        unit: {
          groups: new Array(50).fill(null).map(() => ({
            names: new Array(10).fill('x-pack/plugins/index_lifecycle_management/jest.config.js'),
          })),
        },
      },
      null,
      2
    )
  );
  bk.uploadArtifacts('jest_run_order.json');

  // // write the config for functional steps to an artifact that can be used by the individual functional jobs
  // Fs.writeFileSync('ftr_run_order.json', JSON.stringify(ftrRunOrder, null, 2));
  // bk.uploadArtifacts('ftr_run_order.json');

  // upload the step definitions to Buildkite
  bk.uploadSteps([
    {
      label: 'Jest Tests',
      command: getRequiredEnv('JEST_UNIT_SCRIPT'),
      parallelism: 500,
      concurrency: 50,
      concurrency_group: 'jest-safe-act-flaky-testing',
      timeout_in_minutes: 90,
      key: 'jest',
      agents: {
        queue: 'n2-4-spot',
      },
      retry: {
        automatic: [
          {
            exit_status: '-1',
            limit: 3,
          },
        ],
      },
    },
  ]);
}
