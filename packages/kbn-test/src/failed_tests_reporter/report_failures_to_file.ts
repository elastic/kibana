/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';
import { mkdirSync, readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { REPO_ROOT } from '@kbn/utils';

import { TestFailure } from './get_failures';

export function reportFailuresToFile(failures: TestFailure[]) {
  if (!failures?.length) {
    return;
  }

  // Jest could, in theory, fail 1000s of tests and write 1000s of failures
  // So let's just write files for the first 20
  for (const failure of failures.slice(0, 20)) {
    const hash = createHash('md5').update(failure.name).digest('hex');
    const filenameBase = `${
      process.env.BUILDKITE_JOB_ID ? process.env.BUILDKITE_JOB_ID + '-' : ''
    }${hash}`;
    const dir = join('target', 'test_failures');

    const failureLog = [
      ['Test:', '-----', failure.classname, failure.name, ''],
      ['Failure:', '--------', failure.failure],
      failure['system-out'] ? ['', 'Standard Out:', '-------------', failure['system-out']] : [],
    ]
      .flat()
      .join('\n');

    process.env.BUJILDKITE_BUILD_ID = 'de8a19f8-f2da-418c-8b8e-9c2ce6419cee';
    process.env.BUILDKITE_JOB_ID = 'da9f73cb-e613-414a-8d2d-f68ef5005ab8';
    process.env.BUILDKITE_BUILD_URL = 'https://buildkite.com/elastic/kibana-hourly/builds/603';
    process.env.BUILDKITE_LABEL = 'Default CI Group';
    process.env.BUILDKITE_PARALLEL_JOB = '1';

    const failureJSON = JSON.stringify(
      {
        ...failure,
        hash,
        buildId: process.env.BUJILDKITE_BUILD_ID || '',
        jobId: process.env.BUILDKITE_JOB_ID || '',
        url: process.env.BUILDKITE_BUILD_URL || '',
        jobName: process.env.BUILDKITE_LABEL
          ? `${process.env.BUILDKITE_LABEL}${
              process.env.BUILDKITE_PARALLEL_JOB ? ` #${process.env.BUILDKITE_PARALLEL_JOB}` : ''
            }`
          : '',
      },
      null,
      2
    );

    const failureHTML = readFileSync(
      join(
        REPO_ROOT,
        'packages',
        'kbn-test',
        'src',
        'failed_tests_reporter',
        'report_failures_to_file_html_template.html'
      )
    )
      .toString()
      .replace('$TITLE', failure.name.length > 20 ? `...${failure.name.slice(-20)}` : failure.name)
      .replace(
        '$MAIN',
        `
        ${failure.classname
          .split('.')
          .map((part) => `<h5>${part.replace('·', '.')}</h5>`)
          .join('')}
        <hr />
        <p><strong>${failure.name}</strong></p>
        <pre>${failure.failure}</pre>
        <pre>${failure['system-out']}</pre>
      `
      );

    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${filenameBase}.log`), failureLog, 'utf8');
    writeFileSync(join(dir, `${filenameBase}.html`), failureHTML, 'utf8');
    writeFileSync(join(dir, `${filenameBase}.json`), failureJSON, 'utf8');
  }
}
