#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import assert from 'node:assert';
import { $ } from 'execa';
import fg from 'fast-glob';
import AdmZip from 'adm-zip';
import { asyncForEach } from '@kbn/std';

const root = await $`pwd`;

// Install puppeteer to the version we built chromium for
await $`yarn add "puppeteer@${process.env.PUPPETEER_VERSION}"`;

// Add paths.ts to git
await $`yarn kbn bootstrap`;
await $`git add package.json yarn.lock`;

// switch working dir to the screenshotting server directory
await $`cd src/platform/packages/private/kbn-screenshotting-server/src`;

await $`mkdir -p chromium && cd chromium`;

/**
 * @typedef DownloadDefinition
 * @property {'linux64' | 'mac-arm64' | 'mac-x64' | 'win32' | 'win64'} platform
 * @property {string} url
 */

/**
 * @typedef VersionDefinition
 * @property {string} version
 * @property {string} revision
 * @property {{
 *  chrome: DownloadDefinition[]
 *  'chrome-headless-shell': DownloadDefinition[] | undefined
 * }} downloads
 */

/**
 * @description list of known good versions of chromium provided by google
 * @type {{
 *  timestamp: string
 *  versions: VersionDefinition[]
 * }}
 */
const { stdout: requestResult } =
  await $`wget https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json`
    .pipe`cat`;

const { versions } = JSON.parse(requestResult);

const chromiumVersion = await $`buildkite-agent meta-data get "chromium_version"`;
const chromiumRevision = await $`buildkite-agent meta-data get "chromium_revision"`;

const matchedChromeConfig = versions.find(
  (v) => v.version === chromiumVersion && v.revision === chromiumRevision
);

if (!matchedChromeConfig || !matchedChromeConfig.downloads['chrome-headless-shell']) {
  throw new Error(`Failed to find a known good version for chromium ${chromiumVersion}`);
}

const config = {};

await Promise.all(
  asyncForEach(matchedChromeConfig.downloads['chrome-headless-shell'], async (download) => {
    if (download.platform !== 'linux64' || download.platform !== 'win32') {
      console.log(`---Downloading ${download.platform}\n`);
      await $`wget ${download.url}`;
      console.log(
        `---Extracting and computing checksum for chrome-headless-shell-${download.platform}\n`
      );

      const archiveCheckSum = await $`sha256sum chrome-headless-shell-${download.platform}.zip`;
      const zip = new AdmZip(`chrome-headless-shell-${download.platform}.zip`);
      zip.extractAllTo(`chrome-headless-shell-${download.platform}`, { overwrite: true });

      const binaryChecksum =
        await $`sha256sum chrome-headless-shell-${download.platform}/chrome-headless-shell`;

      config[download.platform] = {
        archiveCheckSum,
        binaryChecksum,
      };
    }
  })
);

console.log('--Downloading artefact from prior step');

// download the chromium build artefact from prior step
await $`buildkite-agent artifact download chromium-*`;

// search pattern is informed by artifact we have downloaded, and intentional so we only select the linux builds
await Promise.all(
  asyncForEach(['arm64', 'x64'], async (arch) => {
    const [match] = await fg(`chromium-*-linux_${arch}.zip`);

    if (!match) {
      throw new Error(`No linux build artefacts found for ${arch}`);
    }

    const archiveCheckSum = await $`sha256sum ${match}`;

    assert.equal(
      archiveCheckSum,
      readFileSync(`${parse(match).name}.sha256`, 'utf-8'),
      'Checksum mismatch'
    );

    const zip = new AdmZip(match);
    zip.extractAllTo(`headless_shell-linux_${arch}`, { overwrite: true });

    const binaryChecksum = await $`sha256sum headless_shell-linux_${arch}/headless_shell`;

    config[`linux_${arch}`] = {
      archiveFilename: match,
      archiveCheckSum,
      binaryChecksum,
    };
  })
);

// modify paths.ts file
await $`npx -y --package=jscodeshift@17.1.2 
-c "jscodeshift 
  --extensions=ts 
  --parser=tsx 
  --transform ${resolve(
    root,
    '.buildkite/scripts/pipelines/chromium_linux_build/create_pr/transform_path_file.js'
  )} ./paths.ts 
  --updateConfig=${JSON.stringify(config)}" 
  --chromiumRevision=${chromiumRevision} 
  --chromiumVersion=${chromiumVersion}`;

const pathDiff = await $`git diff paths.ts`;
const packageJsonDiff = await $`git diff ${resolve(root, 'package.json')}`;

await $`ts-node ${resolve(root, '.buildkite/scripts/lifecycle/comment_on_pr.ts')} \
        --message "Linux headless chromium build completed at: $BUILDKITE_BUILD_URL \n #### Patch to update puppeteer \n \`\`\`${pathDiff}\`\`\` \n \`\`\`${packageJsonDiff}\`\`\` " \
        --context "chromium-linux-build-diff" \
        --clear-previous`;
