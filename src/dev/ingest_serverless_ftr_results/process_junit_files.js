/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { getFailures } from '@kbn/failed-test-reporter-cli/failed_tests_reporter/get_failures';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { readTestReport } from '@kbn/failed-test-reporter-cli/failed_tests_reporter/test_report';
import globby from 'globby';
import { createFailError } from '@kbn/dev-cli-errors';
import { Client, HttpConnection } from '@elastic/elasticsearch';

export const processJunitFiles = (log) => async (patterns) => {
  const reportPaths = await globby(patterns, {
    absolute: true,
  });
  for (const reportPath of reportPaths) {
    const report = await readTestReport(reportPath);
    const failures = getFailures(report);
    await reportFailuresToEs(log, failures);
  }
};

async function reportFailuresToEs(log, failures) {
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
      // build: {
      //   id: process.env.BUILDKITE_BUILD_ID,
      //   name: process.env.BUILDKITE_PIPELINE_NAME,
      //   jobId: process.env.BUILDKITE_JOB_ID,
      //   url: process.env.BUILDKITE_BUILD_URL,
      // },
      // git: {
      //   repo: process.env.BUILDKITE_REPO,
      //   branch: process.env.BUILDKITE_BRANCH,
      //   commit: process.env.BUILDKITE_COMMIT,
      // },
    },
  ]);

  const resp = await client.bulk({ body }, { meta: true });
  if (resp?.body?.errors) {
    log.error(JSON.stringify(resp.body.items, null, 2));
  }
}
