/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { createHash } from 'crypto';

import globby from 'globby';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { escape } from 'he';
import { FtrScreenshotFilename } from '@kbn/ftr-screenshot-filename';
import { JourneyScreenshots } from '@kbn/journeys';

import { BuildkiteMetadata } from './buildkite_metadata';
import { TestFailure } from './get_failures';

interface JourneyMeta {
  journeyName: string;
}
function getJourneyMetadata(rootMeta: Record<string, unknown>): JourneyMeta | undefined {
  const { journeyName } = rootMeta;
  if (typeof journeyName === 'string') {
    return { journeyName };
  }

  return undefined;
}

async function getJourneySnapshotHtml(log: ToolingLog, journeyMeta: JourneyMeta) {
  let screenshots;
  try {
    screenshots = await JourneyScreenshots.load(journeyMeta.journeyName);
  } catch (error) {
    log.error(`Failed to load journey screenshots: ${error.message}`);
    return '';
  }

  return [
    '<section>',
    '<h5>Steps</h5>',
    ...screenshots.get().flatMap(({ title, path, fullscreenPath }) => {
      const base64 = Fs.readFileSync(path, 'base64');
      const fullscreenBase64 = Fs.readFileSync(fullscreenPath, 'base64');

      return [
        `<p><strong>${escape(title)}</strong></p>`,
        `<div class="screenshotContainer">
          <img class="screenshot img-fluid img-thumbnail" src="data:image/png;base64,${base64}" />
          <img class="screenshot img-fluid img-thumbnail fs" src="data:image/png;base64,${fullscreenBase64}" />
          <button type="button" class="toggleFs on" title="Expand screenshot to full page">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-expand" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8zM7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10z"/>
            </svg>
          </button>
          <button type="button" class="toggleFs off" title="Restrict screenshot to content visible in the viewport">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-collapse" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8zm7-8a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 4.293V.5A.5.5 0 0 1 8 0zm-.5 11.707-1.146 1.147a.5.5 0 0 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 11.707V15.5a.5.5 0 0 1-1 0v-3.793z"/>
            </svg>
          </button>
        </div>`,
      ];
    }),
    '</section>',
  ].join('\n');
}

let _allScreenshotsCache: Array<{ path: string; name: string }> | undefined;
function getAllScreenshots(log: ToolingLog) {
  return (_allScreenshotsCache ??= findAllScreenshots(log));
}
function findAllScreenshots(log: ToolingLog) {
  try {
    return globby
      .sync(
        [
          'test/functional/**/screenshots/failure/*.png',
          'x-pack/test/functional/**/screenshots/failure/*.png',
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
  } catch (error) {
    log.error(`Failed to find screenshots: ${error.message}`);
    return [];
  }
}

function getFtrScreenshotHtml(log: ToolingLog, failureName: string) {
  return getAllScreenshots(log)
    .filter((s) => s.name.startsWith(FtrScreenshotFilename.create(failureName, { ext: false })))
    .map((s) => {
      const base64 = Fs.readFileSync(s.path).toString('base64');
      return `
        <div class="screenshotContainer">
          <img class="screenshot img-fluid img-thumbnail" src="data:image/png;base64,${base64}" />
        </div>
      `;
    })
    .join('\n');
}

export async function reportFailuresToFile(
  log: ToolingLog,
  failures: TestFailure[],
  bkMeta: BuildkiteMetadata,
  rootMeta: Record<string, unknown>
) {
  if (!failures?.length) {
    return;
  }

  const journeyMeta = getJourneyMetadata(rootMeta);

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

    const failureHTML = Fs.readFileSync(
      require.resolve('./report_failures_to_file_html_template.html')
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
            ${
              failure.commandLine
                ? `<div>
                     <strong>Command Line</strong>:
                     <pre>${escape(failure.commandLine)}</pre>
                   </div>`
                : ''
            }
            <div>
                <strong>Failures in tracked branches</strong>:
                    <span class="badge rounded-pill bg-danger">${failure.failureCount || 0}</span>
            </div>
            ${
              failure.githubIssue
                ? `<div>
                     <a href="${escape(failure.githubIssue)}">${escape(failure.githubIssue)}</a>
                   </div>`
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
        ${
          journeyMeta
            ? await getJourneySnapshotHtml(log, journeyMeta)
            : getFtrScreenshotHtml(log, failure.name)
        }
        ${
          failure['system-out']
            ? `
              <h5>Stdout</h5>
              <pre>${escape(failure['system-out'] || '')}</pre>
            `
            : ''
        }
      `
      );

    Fs.mkdirSync(dir, { recursive: true });
    Fs.writeFileSync(Path.join(dir, `${filenameBase}.log`), failureLog, 'utf8');
    Fs.writeFileSync(Path.join(dir, `${filenameBase}.html`), failureHTML, 'utf8');
    Fs.writeFileSync(Path.join(dir, `${filenameBase}.json`), failureJSON, 'utf8');
  }
}
