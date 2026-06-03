/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const childProcess = require('child_process');
const fs = require('fs');
const https = require('https');
const { createRequire } = require('module');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');
const extract = require('extract-zip');
const requireFromWorkspace = createRequire(path.resolve(process.cwd(), 'package.json'));
const chromeDriver = requireFromWorkspace('chromedriver');

const KNOWN_GOOD_VERSIONS_URL =
  'https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json';

function log(message) {
  process.stderr.write(`[ftr-benchmarks] ${message}\n`);
}

function getChromeForTestingPlatform() {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
  }

  if (process.platform === 'linux' && process.arch === 'x64') {
    return 'linux64';
  }

  if (process.platform === 'win32') {
    return process.arch === 'x64' ? 'win64' : 'win32';
  }

  throw new Error(`Unsupported Chrome for Testing platform: ${process.platform}-${process.arch}`);
}

function getChromeBinaryRelativePath(platform) {
  if (platform === 'mac-arm64' || platform === 'mac-x64') {
    return path.join(
      `chrome-${platform}`,
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing'
    );
  }

  return path.join('chrome-linux64', 'chrome');
}

function getChromeDriverVersion() {
  const { stdout } = childProcess.spawnSync(chromeDriver.path, ['--version'], {
    encoding: 'utf8',
  });
  const versionMatch = stdout?.match(/ChromeDriver\s+([^\s]+)/);

  if (versionMatch) {
    return versionMatch[1];
  }

  return chromeDriver.version;
}

async function fetchJson(url) {
  return await new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
          response.resume();
          return;
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve(JSON.parse(body));
        });
      })
      .on('error', reject);
  });
}

async function download(url, destination) {
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });

  await new Promise((resolve, reject) => {
    https
      .get(url, async (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
          response.resume();
          return;
        }

        try {
          await pipeline(response, fs.createWriteStream(destination));
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

function findChromeDownload(versions, chromeDriverVersion, platform) {
  const major = chromeDriverVersion.split('.')[0];
  const matchingVersions = versions
    .filter(({ version }) => version === chromeDriverVersion || version.startsWith(`${major}.`))
    .reverse();
  const exactMatch = matchingVersions.find(({ version }) => version === chromeDriverVersion);

  for (const versionInfo of [exactMatch, ...matchingVersions]) {
    if (!versionInfo) {
      continue;
    }

    const downloadInfo = versionInfo.downloads.chrome?.find(
      (downloadItem) => downloadItem.platform === platform
    );

    if (downloadInfo) {
      return {
        version: versionInfo.version,
        url: downloadInfo.url,
      };
    }
  }

  throw new Error(
    `Unable to find Chrome for Testing download for ChromeDriver ${chromeDriverVersion} on ${platform}`
  );
}

function hasExpectedChromeBinary(binaryPath, expectedVersion) {
  if (!fs.existsSync(binaryPath)) {
    return false;
  }

  const { stdout, error } = childProcess.spawnSync(binaryPath, ['--version'], {
    encoding: 'utf8',
  });

  return !error && stdout.includes(expectedVersion);
}

async function main() {
  const platform = getChromeForTestingPlatform();
  const chromeDriverVersion = getChromeDriverVersion();
  const knownGoodVersions = await fetchJson(KNOWN_GOOD_VERSIONS_URL);
  const chromeDownload = findChromeDownload(
    knownGoodVersions.versions,
    chromeDriverVersion,
    platform
  );
  const installDir = path.resolve(
    process.cwd(),
    'data',
    'kbn-ftr-benchmarks',
    'chrome-for-testing',
    chromeDownload.version,
    platform
  );
  const binaryPath = path.join(installDir, getChromeBinaryRelativePath(platform));

  if (hasExpectedChromeBinary(binaryPath, chromeDownload.version)) {
    process.stdout.write(binaryPath);
    return;
  }

  const archivePath = path.join(os.tmpdir(), `chrome-for-testing-${chromeDownload.version}.zip`);
  log(
    `Downloading Chrome for Testing ${chromeDownload.version} for ${platform} from ${chromeDownload.url}`
  );
  await download(chromeDownload.url, archivePath);
  log(`Extracting Chrome for Testing ${chromeDownload.version} to ${installDir}`);
  await fs.promises.rm(installDir, { recursive: true, force: true });
  await fs.promises.mkdir(installDir, { recursive: true });
  await extract(archivePath, { dir: installDir });
  await fs.promises.chmod(binaryPath, 0o755).catch(() => {});
  log(`Chrome for Testing binary ready at ${binaryPath}`);
  process.stdout.write(binaryPath);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
