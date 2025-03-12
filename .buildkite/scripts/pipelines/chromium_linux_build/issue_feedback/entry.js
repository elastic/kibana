/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { parse, resolve } = require('path');
const { readFileSync, createWriteStream } = require('fs');
const assert = require('assert');
const { execFile } = require('child_process');
const { finished } = require('stream').promises;
const axios = require('axios');
const fg = require('fast-glob');
const AdmZip = require('adm-zip');

/**
 * @typedef DownloadDefinition
 * @property {'linux64' | 'mac-arm64' | 'mac-x64' | 'win32' | 'win64'} platform
 * @property {string} url
 */

/**
 * @description defines the structure of the response return from https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json
 * @typedef VersionDefinition
 * @property {string} version
 * @property {string} revision
 * @property {{
 *  chrome: DownloadDefinition[]
 *  'chrome-headless-shell': DownloadDefinition[] | undefined
 * }} downloads
 */

/**
 * @description helper to invoke binaries on the machine running this script
 * @param {string} file
 * @param {string[]} fileArguments
 * @param {import('child_process').ExecFileOptions & { printToScreen?: boolean }} options
 */
const $ = async (file, fileArguments, { printToScreen, ...options } = {}) => {
  const { stdout } = await new Promise((resolve, reject) => {
    const process = execFile(file, fileArguments, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      resolve({ stdout, stderr });
    });

    if (printToScreen) {
      process.stdout.on('data', console.log);
      process.stderr.on('data', console.error);
    }
  });

  return stdout.trim();
};

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
const getSha256Hash = async (filePath) => {
  // sha256sum returns the hash and the file name, we only need the hash
  const [hash] = (await $('sha256sum', [filePath])).split(/\s/);
  return hash;
};

(async () => {
  const buildRoot = process.cwd();

  // switch working dir to the screenshotting server directory
  process.chdir('src/platform/packages/private/kbn-screenshotting-server/src');

  await $('mkdir', ['-p', 'chromium']);

  process.chdir('chromium');

  const response = await axios.get(
    'https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json'
  );

  /**
   * @description list of known good versions of chromium provided by google
   * @type {{
   *  timestamp: string
   *  versions: VersionDefinition[]
   * }}
   */
  const { versions } = response.data;

  const chromiumVersion = await $('buildkite-agent', ['meta-data', 'get', 'chromium_version'], {
    printToScreen: true,
  });
  const chromiumRevision = await $('buildkite-agent', ['meta-data', 'get', 'chromium_revision'], {
    printToScreen: true,
  });

  const matchedChromeConfig = versions.find(
    (v) => v.version === chromiumVersion && v.revision === chromiumRevision
  );

  if (!matchedChromeConfig?.downloads?.['chrome-headless-shell']?.length) {
    throw new Error(`Failed to find a known good version for chromium ${chromiumVersion}`);
  }

  /**
   * @type {import('./transform_path_file').ChromiumUpdateConfigMap}
   */
  const config = {};

  await Promise.all(
    matchedChromeConfig.downloads['chrome-headless-shell'].map(async (download) => {
      if (
        download.platform === 'win64' ||
        download.platform === 'mac-x64' ||
        download.platform === 'mac-arm64'
      ) {
        console.log(`---Attempting downloading for ${download.platform} chrome-headless-shell \n`);

        const url = new URL(download.url);

        const downloadResponse = await axios.get(url.toString(), { responseType: 'stream' });

        const downloadFileName = parse(url.pathname).base;

        downloadResponse.data.pipe(createWriteStream(downloadFileName));

        await finished(downloadResponse.data);

        console.log(`---Extracting and computing checksum for ${downloadFileName}\n`);

        const archiveChecksum = await getSha256Hash(downloadFileName);

        const zip = new AdmZip(downloadFileName);
        zip.extractAllTo('.', true);

        const binaryChecksum = await getSha256Hash(
          `${parse(downloadFileName).name}/chrome-headless-shell${
            /^win/.test(download.platform) ? '.exe' : ''
          }`
        );

        config[download.platform.replace('-', '_')] = {
          archiveChecksum,
          binaryChecksum,
        };
      }
    })
  );

  await Promise.all(
    ['arm64', 'x64'].map(async (arch) => {
      console.log('--Attempting downloading artifacts from prior step');

      // download the chromium build artefact from prior step
      await $(
        'buildkite-agent',
        [
          'artifact',
          'download',
          `*${arch}.*`,
          '.',
          '--build',
          String(process.env.BUILDKITE_BUILD_ID),
        ],
        { printToScreen: true }
      );

      const linuxBuildArtifact = await fg(`chromium-*_${arch}.*`);

      assert(linuxBuildArtifact.length, 'No linux build artifacts found');

      const match = linuxBuildArtifact.find((artifact) =>
        RegExp(String.raw`${arch}\.zip`).test(artifact)
      );

      if (!match) {
        throw new Error(`No linux build artifacts found for ${arch}`);
      }

      const archiveChecksum = await getSha256Hash(match);

      assert.strictEqual(
        archiveChecksum,
        readFileSync(`${parse(match).name}.sha256`, 'utf-8').split(/\s/)[0],
        'Checksum mismatch'
      );

      const zip = new AdmZip(match);
      zip.extractAllTo('.', true);

      const binaryChecksum = await getSha256Hash(`headless_shell-linux_${arch}/headless_shell`);

      config[`linux_${arch}`] = {
        archiveFilename: match,
        archiveChecksum,
        binaryChecksum,
      };
    })
  );

  console.log('--Modifying paths.ts file\n');

  await $(
    'npx',
    [
      '--',
      'jscodeshift',
      '--extensions=ts',
      '--parser=tsx',
      '--fail-on-error',
      `--transform`,
      resolve(
        buildRoot,
        '.buildkite/scripts/pipelines/chromium_linux_build/issue_feedback/transform_path_file.js'
      ),
      '../paths.ts',
      `--updateConfig=${JSON.stringify(config)}`,
      `--chromiumRevision=${chromiumRevision}`,
      `--chromiumVersion=${chromiumVersion}`,
    ],
    { printToScreen: true }
  );

  console.log('---Generating paths.ts file diff \n');

  const pathDiff = await $('git', ['diff', '../paths.ts']);

  assert.ok(pathDiff, 'Failed to generate diff');

  console.log('---Providing feedback to issue \n');

  await $('ts-node', [
    `${resolve(buildRoot, '.buildkite/scripts/lifecycle/comment_on_pr.ts')}`,
    '--message',
    `Linux headless chromium build completed at: ${process.env.BUILDKITE_BUILD_URL} ✨💅🏾 \n\n #### How to update puppeteer \n - You'll want to run \`yarn add puppeteer@${process.env.PUPPETEER_VERSION}\` \n - Next we'll want to apply the following patch; \n\n\`\`\`diff\n${pathDiff}\n\`\`\` \n - After applying the patch, create a PR to update puppeteer`,
    '--context',
    'chromium-linux-build-diff',
    '--clear-previous',
  ]);
})();
