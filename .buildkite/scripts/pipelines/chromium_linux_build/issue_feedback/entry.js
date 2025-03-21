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

  const prTitle = `[Reporting] Update puppeteer to version ${process.env.PUPPETEER_VERSION}`;

  const prSearchResult = await $('gh', [
    'pr',
    'list',
    '--search',
    prTitle,
    '--state',
    'open',
    '--author',
    process.env.KIBANA_MACHINE_USERNAME,
    '--limit',
    '1',
    '--json',
    'title',
    '-q',
    '.[].title',
  ]);

  assert.notStrictEqual(prSearchResult, prTitle, 'PR already exists');

  const branchName = `chore/puppeteer_${process.env.PUPPETEER_VERSION}_update`;

  // configure git
  await $('git', ['config', '--global', 'user.name', process.env.KIBANA_MACHINE_USERNAME]);
  await $('git', ['config', '--global', 'user.email', process.env.KIBANA_MACHINE_EMAIL]);

  // create a new branch to update puppeteer
  await $('git', ['checkout', '-b', `${branchName}_temp`]);

  console.log('---Updating puppeteer package to version %s', process.env.PUPPETEER_VERSION);

  await $('yarn', ['add', `puppeteer@${process.env.PUPPETEER_VERSION}`]);
  await $('yarn', ['kbn', 'bootstrap']);
  await $('git', ['add', 'package.json', 'yarn.lock']);
  await $('git', [
    'commit',
    '-m',
    `chore: update puppeteer to version ${process.env.PUPPETEER_VERSION}`,
  ]);

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

  assert.notStrictEqual(
    matchedChromeConfig?.downloads?.['chrome-headless-shell']?.length,
    0,
    `Failed to find a known good version for chromium ${chromiumVersion}`
  );

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

      assert.ok(match, `No linux build artifacts found for ${arch}`);

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

  await $('git', ['add', '../paths.ts']);

  await $('git', ['commit', '-m', 'chore: update chromium paths']);

  console.log('---Creating pull request \n');

  // create clean branch based off of main

  await $('git', ['checkout', 'main']);

  await $('git', ['checkout', '-b', branchName]);

  await $('git', ['cherry-pick', `${branchName}_temp~1`, `${branchName}_temp~0`], {
    printToScreen: true,
  });

  await $('git', ['push', 'origin', branchName], {
    printToScreen: true,
  });

  await $(
    'gh',
    [
      'pr',
      'create',
      '--title',
      prTitle,
      '--body',
      `Closes #${process.env.GITHUB_PR_NUMBER} \n\n This PR updates puppeteer to version ${process.env.PUPPETEER_VERSION} and updates the chromium paths to the latest known good version for windows and mac where the chromium revision is ${chromiumRevision} and version is ${chromiumVersion}, for linux a custom build was triggered to build chromium binaries for both x64 and arm64. \n **NB** This PR should be tested before merging it in as puppeteer might have breaking changes we are not aware of`,
      '--base',
      'main',
      '--head',
      branchName,
      '--label',
      'release_note:skip',
      '--label',
      'Team:SharedUX',
    ],
    {
      printToScreen: true,
    }
  );

  console.log('---Providing feedback to issue \n');

  await $('ts-node', [
    `${resolve(buildRoot, '.buildkite/scripts/lifecycle/comment_on_pr.ts')}`,
    '--message',
    `Linux headless chromium build completed at: ${process.env.BUILDKITE_BUILD_URL} ✨💅🏾 \n\n See the PR linked to this issue`,
    '--issue-number',
    process.env.GITHUB_ISSUE_NUMBER,
    '--repository',
    process.env.GITHUB_ISSUE_BASE_REPO,
    '--repository-owner',
    process.env.GITHUB_ISSUE_BASE_OWNER,
    '--context',
    'chromium-linux-build-diff',
    '--clear-previous',
  ]);
})();
