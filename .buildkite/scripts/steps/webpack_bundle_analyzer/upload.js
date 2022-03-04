/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

const GITHUB_CONTEXT = 'Build and Publish Webpack bundle analyzer reports';

const WEBPACK_REPORTS =
  process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
    ? `pr-${process.env.BUILDKITE_PULL_REQUEST}`
    : process.env.BUILDKITE_BRANCH.replace('/', '__');
const WEBPACK_REPORTS_BUCKET = 'ci-artifacts.kibana.dev/webpack_bundle_analyzer';
const WEBPACK_REPORTS_BUCKET_URL = `https://${WEBPACK_REPORTS_BUCKET}/${WEBPACK_REPORTS}`;
const WEBPACK_REPORTS_BASE_URL = `${WEBPACK_REPORTS_BUCKET_URL}/${process.env.BUILDKITE_COMMIT}`;

const exec = (...args) => execSync(args.join(' '), { stdio: 'inherit' });

const ghStatus = (state, description) =>
  exec(
    `gh api "repos/elastic/kibana/statuses/${process.env.BUILDKITE_COMMIT}"`,
    `-f state=${state}`,
    `-f target_url="${process.env.BUILDKITE_BUILD_URL}"`,
    `-f context="${GITHUB_CONTEXT}"`,
    `-f description="${description}"`,
    `--silent`
  );

const upload = () => {
  const originalDirectory = process.cwd();
  process.chdir(path.join('.', 'built_assets', 'webpack_bundle_analyzer'));
  try {
    const reports = execSync(`ls -1`).toString().trim().split('\n');
    const listHtml = reports
      .map((report) => `<li><a href="${WEBPACK_REPORTS_BASE_URL}/${report}">${report}</a></li>`)
      .join('\n');

    const html = `
      <html>
        <body>
          <h1>Webpack Bundle Analyzer</h1>
          <ul>
            ${listHtml}
          </ul>
        </body>
      </html>
    `;

    fs.writeFileSync('index.html', html);
    console.log('--- Uploading Webpack Bundle Analyzer reports');
    exec(`
      gsutil -q -m cp -r -z html '*' 'gs://${WEBPACK_REPORTS_BUCKET}/${WEBPACK_REPORTS}/${process.env.BUILDKITE_COMMIT}/'
      gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp -z html 'index.html' 'gs://${WEBPACK_REPORTS_BUCKET}/${WEBPACK_REPORTS}/latest/'
    `);

    if (process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false') {
      exec(
        `buildkite-agent meta-data set pr_comment:webpack_bundle_reports:head '* [Webpack Bundle Analyzer](${WEBPACK_REPORTS_BASE_URL})'`
      );
    }
  } finally {
    process.chdir(originalDirectory);
  }
};

try {
  ghStatus('pending', 'Building Webpack Bundle Analyzer reports');
  upload();
  ghStatus('success', 'Webpack bundle analyzer reports built');
} catch (error) {
  ghStatus('error', 'Building Webpack Bundle Analyzer reports failed');
  throw error;
}
