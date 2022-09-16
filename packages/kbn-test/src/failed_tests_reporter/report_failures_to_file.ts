/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { createHash } from 'crypto';

import globby from 'globby';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/utils';
import { escape } from 'he';

import { BuildkiteMetadata } from './buildkite_metadata';
import { TestFailure } from './get_failures';

export function reportFailuresToFile(
  log: ToolingLog,
  failures: TestFailure[],
  bkMeta: BuildkiteMetadata
) {
  if (!failures?.length) {
    return;
  }

  let screenshots: Array<{ path: string; name: string }>;
  try {
    screenshots = globby
      .sync(
        [
          'test/functional/**/screenshots/failure/*.png',
          'x-pack/test/functional/**/screenshots/failure/*.png',
          'data/ftr_screenshots/*.png',
        ],
        {
          cwd: REPO_ROOT,
          absolute: true,
        }
      )
      .map((path) => ({
        path,
        name: Path.basename(path, Path.extname(path)),
      }));
  } catch (e) {
    log.error(e as Error);
    screenshots = [];
  }

  // Jest could, in theory, fail 1000s of tests and write 1000s of failures
  // So let's just write files for the first 20
  for (const failure of failures.slice(0, 20)) {
    const hash = createHash('md5').update(failure.name).digest('hex');
    const filenameBase = `${
      process.env.BUILDKITE_JOB_ID ? process.env.BUILDKITE_JOB_ID + '_' : ''
    }${hash}`;
    const dir = Path.join('target', 'test_failures');

    const failureLog = [
      ['Test:', '-----', failure.classname, failure.name, ''],
      ['Failure:', '--------', failure.failure],
      failure['system-out'] ? ['', 'Standard Out:', '-------------', failure['system-out']] : [],
    ]
      .flat()
      .join('\n');

    const failureJSON = JSON.stringify(
      {
        ...failure,
        hash,
        buildId: bkMeta.buildId,
        jobId: bkMeta.jobId,
        url: bkMeta.url,
        jobUrl: bkMeta.jobUrl,
        jobName: bkMeta.jobName,
      },
      null,
      2
    );

    const truncatedName = failure.name.replaceAll(/[^ a-zA-Z0-9-]+/g, '').slice(0, 80);
    const failureNameHash = createHash('sha256').update(failure.name).digest('hex');
    const screenshotPrefix = `${truncatedName}-${failureNameHash}`;

    const screenshotHtml = screenshots
      .filter((s) => s.name.startsWith(screenshotPrefix))
      .map((s) => {
        const base64 = Fs.readFileSync(s.path).toString('base64');
        return `<img class="screenshot img-fluid img-thumbnail" src="data:image/png;base64,${base64}" />`;
      })
      .join('\n');

    const failureHTML = Fs.readFileSync(
      Path.resolve(
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
          bkMeta.jobUrl
            ? `<p>
              <small>
                <strong>Buildkite Job</strong><br />
                <a href="${escape(bkMeta.jobUrl)}">${escape(bkMeta.jobUrl)}</a>
              </small>
            </p>`
            : ''
        }
        <pre>${escape(failure.failure)}</pre>
        ${screenshotHtml}
        <pre>${escape(failure['system-out'] || '')}</pre>
      `
      );

    Fs.mkdirSync(dir, { recursive: true });
    Fs.writeFileSync(Path.join(dir, `${filenameBase}.log`), failureLog, 'utf8');
    Fs.writeFileSync(Path.join(dir, `${filenameBase}.html`), failureHTML, 'utf8');
    Fs.writeFileSync(Path.join(dir, `${filenameBase}.json`), failureJSON, 'utf8');
  }
}
