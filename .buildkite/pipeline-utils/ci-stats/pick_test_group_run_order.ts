/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BuildkiteClient } from '../buildkite';

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing required environment variable "${name}"`);
  }
  return value;
};

export async function pickTestGroupRunOrder() {
  new BuildkiteClient().uploadSteps([
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
