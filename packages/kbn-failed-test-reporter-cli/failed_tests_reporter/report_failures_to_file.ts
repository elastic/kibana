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
    ...screenshots.get().flatMap(({ title, path }) => {
      const base64 = Fs.readFileSync(path, 'base64');

      return [
        `<p><strong>${escape(title)}</strong></p>`,
        `<img class="screenshot img-fluid img-thumbnail" src="data:image/png;base64,${base64}" />`,
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
      return `<img class="screenshot img-fluid img-thumbnail" src="data:image/png;base64,${base64}" />`;
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
