/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pLimit from 'p-limit';
import { loadKibanaModule } from '../../../pipeline-utils/load_kibana_module.ts';
import { getKibanaDir } from '#pipeline-utils';

const { storybookAliases } = loadKibanaModule<typeof import('@kbn/dev/storybook/aliases')>(
  '@kbn/dev/storybook/aliases'
);

const STORYBOOK_DIRECTORY =
  process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
    ? `pr-${process.env.BUILDKITE_PULL_REQUEST}`
    : (process.env.BUILDKITE_BRANCH ?? '').replace('/', '__');
const STORYBOOK_BUCKET = 'ci-artifacts.kibana.dev/storybooks';
const STORYBOOK_BUCKET_URL = `https://${STORYBOOK_BUCKET}/${STORYBOOK_DIRECTORY}`;
const STORYBOOK_BASE_URL = `${STORYBOOK_BUCKET_URL}`;

const exec = (command: string) => execSync(command, { stdio: 'inherit' });

const buildStorybook = (storybook: string): Promise<{ logs: string }> => {
  return new Promise((resolve, reject) => {
    const logsBuffer: string[] = [];
    const handleBufferChunk = (chunk: Buffer) => {
      logsBuffer.push(chunk.toString());
    };

    const child = spawn('pnpm', ['storybook', '--site', storybook], {
      stdio: 'pipe',
      env: {
        ...process.env,
        STORYBOOK_BASE_URL,
        NODE_OPTIONS: '--max-old-space-size=6144',
      },
    });

    child.stdout?.on('data', handleBufferChunk);
    child.stderr?.on('data', handleBufferChunk);

    child.on('close', (code) => {
      if (code === 0) {
        logsBuffer.unshift(`--- ✅ ${storybook} storybook\n`);
        resolve({ logs: logsBuffer.join('') });
      } else {
        logsBuffer.unshift(`--- ❌ ${storybook} storybook\n`);
        reject(new Error(logsBuffer.join('')));
      }
    });

    child.on('error', () => {
      logsBuffer.unshift(`--- ❌ ${storybook} storybook\n`);
      reject(new Error(logsBuffer.join('')));
    });
  });
};

const build = async () => {
  console.log('--- Building Storybooks');

  const limit = pLimit(os.availableParallelism());
  const storybooks = Object.keys(storybookAliases);

  try {
    const results = await Promise.all(
      storybooks.map((storybook) => limit(() => buildStorybook(storybook)))
    );

    results.forEach(({ logs }) => {
      console.log(logs);
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const upload = () => {
  const originalDirectory = process.cwd();
  const activateScriptPath = path.join(
    getKibanaDir(),
    '.buildkite',
    'scripts',
    'common',
    'activate_service_account.sh'
  );
  exec(`${activateScriptPath} gs://ci-artifacts.kibana.dev`);
  try {
    console.log('--- Generating Storybooks HTML');

    process.chdir(path.join('.', 'built_assets', 'storybook'));

    const storybooks = execSync(`ls -1d */`)
      .toString()
      .trim()
      .split('\n')
      .map((filePath) => filePath.replace('/', ''));

    const listHtml = storybooks
      .map((storybook) => `<li><a href="${STORYBOOK_BASE_URL}/${storybook}">${storybook}</a></li>`)
      .join('\n');

    const html = `
      <html>
        <body>
          <h1>Storybooks</h1>
          <ul>
            ${listHtml}
          </ul>
        </body>
      </html>
    `;

    fs.writeFileSync('index.html', html);

    console.log('--- Uploading Storybooks');
    exec(`
      gcloud storage cp --cache-control="no-cache, max-age=0, no-transform" --gzip-local=js,css,html,json,map,txt,svg --recursive --no-user-output-enabled '*' 'gs://${STORYBOOK_BUCKET}/${STORYBOOK_DIRECTORY}/'
      gcloud storage cp --cache-control="no-cache, max-age=0, no-transform" --gzip-local=html --no-user-output-enabled 'index.html' 'gs://${STORYBOOK_BUCKET}/${STORYBOOK_DIRECTORY}/latest/'
    `);

    if (process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false') {
      exec(
        `buildkite-agent meta-data set pr_comment:storybooks:head '* [Storybooks Preview](${STORYBOOK_BASE_URL})'`
      );
    }
  } finally {
    process.chdir(originalDirectory);
  }
};

(async () => {
  await build();
  upload();
})();
