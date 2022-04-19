/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import { createFailError } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';

import { TestFailure } from './get_failures';

export async function reportFailuresToEs(log: ToolingLog, failures: TestFailure[]) {
  if (!failures?.length) {
    return;
  }

  if (
    !process.env.TEST_FAILURES_ES_CLOUD_ID ||
    !process.env.TEST_FAILURES_ES_USERNAME ||
    !process.env.TEST_FAILURES_ES_PASSWORD
  ) {
    throw createFailError(
      'TEST_FAILURES_ES_CLOUD_ID, TEST_FAILURES_ES_USERNAME, TEST_FAILURES_ES_PASSWORD must be provided to index test failures'
    );
  }

  const client = new Client({
    cloud: {
      id: process.env.TEST_FAILURES_ES_CLOUD_ID,
    },
    auth: {
      username: process.env.TEST_FAILURES_ES_USERNAME,
      password: process.env.TEST_FAILURES_ES_PASSWORD,
    },
    Connection: HttpConnection,
  });

  const body = failures.flatMap((failure) => [
    {
      create: {
        _index: 'test-failures',
      },
    },
    {
      '@timestamp': new Date(),
      failure,
      build: {
        id: process.env.BUILDKITE_BUILD_ID,
        name: process.env.BUILDKITE_PIPELINE_NAME,
        jobId: process.env.BUILDKITE_JOB_ID,
        url: process.env.BUILDKITE_BUILD_URL,
      },
      git: {
        repo: process.env.BUILDKITE_REPO,
        branch: process.env.BUILDKITE_BRANCH,
        commit: process.env.BUILDKITE_COMMIT,
      },
    },
  ]);

  const resp = await client.bulk({ body }, { meta: true });
  if (resp?.body?.errors) {
    log.error(JSON.stringify(resp.body.items, null, 2));
  }
}
