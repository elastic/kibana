/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, basename, resolve } from 'path';

import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import { escape } from 'he';

import { TestFailure } from './get_failures';

const findScreenshots = (dirPath: string, allScreenshots: string[] = []) => {
  const files = readdirSync(dirPath);

  for (const file of files) {
    if (statSync(join(dirPath, file)).isDirectory()) {
      if (file.match(/node_modules/)) {
        continue;
      }

      allScreenshots = findScreenshots(join(dirPath, file), allScreenshots);
    } else {
      const fullPath = join(dirPath, file);
      if (fullPath.match(/screenshots\/failure\/.+\.png$/)) {
        allScreenshots.push(fullPath);
      }
    }
  }

  return allScreenshots;
};

export function reportFailuresToFile(log: ToolingLog, failures: TestFailure[]) {
  if (!failures?.length) {
    return;
  }

  let screenshots: string[];
  try {
    screenshots = [
      ...findScreenshots(join(REPO_ROOT, 'test', 'functional')),
      ...findScreenshots(join(REPO_ROOT, 'x-pack', 'test', 'functional')),
    ];
  } catch (e) {
    log.error(e as Error);
    screenshots = [];
  }

  const screenshotsByName: Record<string, string> = {};
  for (const screenshot of screenshots) {
    const [name] = basename(screenshot).split('.');
    screenshotsByName[name] = screenshot;
  }

  // Jest could, in theory, fail 1000s of tests and write 1000s of failures
  // So let's just write files for the first 20
  for (const failure of failures.slice(0, 20)) {
    const hash = createHash('md5').update(failure.name).digest('hex');
    const filenameBase = `${
      process.env.BUILDKITE_JOB_ID ? process.env.BUILDKITE_JOB_ID + '_' : ''
    }${hash}`;
    const dir = join('target', 'test_failures');

    const failureLog = [
      ['Test:', '-----', failure.classname, failure.name, ''],
      ['Failure:', '--------', failure.failure],
      failure['system-out'] ? ['', 'Standard Out:', '-------------', failure['system-out']] : [],
    ]
      .flat()
      .join('\n');

    // Buildkite steps that use `parallelism` need a numerical suffix added to identify them
    // We should also increment the number by one, since it's 0-based
    const jobNumberSuffix = process.env.BUILDKITE_PARALLEL_JOB
      ? ` #${parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10) + 1}`
      : '';

    const buildUrl = process.env.BUILDKITE_BUILD_URL || '';
    const jobUrl = process.env.BUILDKITE_JOB_ID
      ? `${buildUrl}#${process.env.BUILDKITE_JOB_ID}`
      : '';

    const failureJSON = JSON.stringify(
      {
        ...failure,
        hash,
        buildId: process.env.BUJILDKITE_BUILD_ID || '',
        jobId: process.env.BUILDKITE_JOB_ID || '',
        url: buildUrl,
        jobUrl,
        jobName: process.env.BUILDKITE_LABEL
          ? `${process.env.BUILDKITE_LABEL}${jobNumberSuffix}`
          : '',
      },
      null,
      2
    );

    let screenshot = '';
    const screenshotName = `${failure.name.replace(/([^ a-zA-Z0-9-]+)/g, '_')}`;
    if (screenshotsByName[screenshotName]) {
      try {
        screenshot = readFileSync(screenshotsByName[screenshotName]).toString('base64');
      } catch (e) {
        log.error(e as Error);
      }
    }

    const screenshotHtml = screenshot
      ? `<img class="screenshot img-fluid img-thumbnail" src="data:image/png;base64,${screenshot}" />`
      : '';

    const failureHTML = readFileSync(
      resolve(
        REPO_ROOT,
        'packages/kbn-test/src/failed_tests_reporter/report_failures_to_file_html_template.html'
      )
    )
      .toString()
      .replace('$TITLE', escape(failure.name))
      .replace(
        '$MAIN',
        `
        ${failure.classname
          .split('.')
          .map((part) => `<h5>${escape(part.replace('·', '.'))}</h5>`)
          .join('')}
        <hr />
        <p><strong>${escape(failure.name)}</strong></p>
        <p>
          <small>
            <strong>Failures in tracked branches</strong>: <span class="badge rounded-pill bg-danger">${
              failure.failureCount || 0
            }</span>
            ${
              failure.githubIssue
                ? `<br /><a href="${escape(failure.githubIssue)}">${escape(
                    failure.githubIssue
                  )}</a>`
                : ''
            }
          </small>
        </p>
        ${
          jobUrl
            ? `<p>
              <small>
                <strong>Buildkite Job</strong><br />
                <a href="${escape(jobUrl)}">${escape(jobUrl)}</a>
              </small>
            </p>`
            : ''
        }
        <pre>${escape(failure.failure)}</pre>
        ${screenshotHtml}
        <pre>${escape(failure['system-out'] || '')}</pre>
      `
      );

    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${filenameBase}.log`), failureLog, 'utf8');
    writeFileSync(join(dir, `${filenameBase}.html`), failureHTML, 'utf8');
    writeFileSync(join(dir, `${filenameBase}.json`), failureJSON, 'utf8');
  }
}
