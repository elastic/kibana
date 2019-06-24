/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const fs = require('fs');
const { promisify } = require('util');
const { pipeline, Transform } = require('stream');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const { createHash } = require('crypto');
const path = require('path');

const asyncPipeline = promisify(pipeline);
const V1_VERSIONS_API = 'https://artifacts-api.elastic.co/v1/versions';

const { cache } = require('./utils');
const { createCliError, isCliError } = require('./errors');

const TEST_ES_SNAPSHOT_VERSION = process.env.TEST_ES_SNAPSHOT_VERSION
  ? process.env.TEST_ES_SNAPSHOT_VERSION
  : 'latest';

function getChecksumType(checksumUrl) {
  if (checksumUrl.endsWith('.sha512')) {
    return 'sha512';
  }

  throw new Error(`unable to determine checksum type: ${checksumUrl}`);
}

function getPlatform(key) {
  if (key.includes('-linux-')) {
    return 'linux';
  }

  if (key.includes('-windows-')) {
    return 'win32';
  }

  if (key.includes('-darwin-')) {
    return 'darwin';
  }
}

function headersToString(headers, indent = '') {
  return [...headers.entries()].reduce(
    (acc, [key, value]) => `${acc}\n${indent}${key}: ${value}`,
    ''
  );
}

async function retry(log, fn) {
  async function doAttempt(attempt) {
    try {
      return await fn();
    } catch (error) {
      if (isCliError(error) || attempt >= 5) {
        throw error;
      }

      log.warning('...failure, retrying in 5 seconds:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
      log.info('...retrying');
      return await doAttempt(attempt + 1);
    }
  }

  return await doAttempt(1);
}

exports.Artifact = class Artifact {
  /**
   * Fetch an Artifact from the Artifact API for a license level and version
   * @param {('oss'|'basic'|'trial')} license
   * @param {string} version
   * @param {ToolingLog} log
   */
  static async getSnapshot(license, version, log) {
    const urlVersion = `${encodeURIComponent(version)}-SNAPSHOT`;
    const urlBuild = encodeURIComponent(TEST_ES_SNAPSHOT_VERSION);
    const url = `${V1_VERSIONS_API}/${urlVersion}/builds/${urlBuild}/projects/elasticsearch`;

    const json = await retry(log, async () => {
      log.info('downloading artifact info from %s', chalk.bold(url));

      const abc = new AbortController();
      const resp = await fetch(url, { signal: abc.signal });
      const json = await resp.text();

      if (resp.status === 404) {
        abc.abort();
        throw createCliError(
          `Snapshots for ${version}/${TEST_ES_SNAPSHOT_VERSION} are not available`
        );
      }

      if (!resp.ok) {
        abc.abort();
        throw new Error(`Unable to read artifact info from ${url}: ${resp.statusText}\n  ${json}`);
      }

      return json;
    });

    // parse the api response into an array of Artifact objects
    const {
      project: { packages: artifactInfoMap },
    } = JSON.parse(json);
    const filenames = Object.keys(artifactInfoMap);
    const hasNoJdkVersions = filenames.some(filename => filename.includes('-no-jdk-'));
    const artifactSpecs = filenames.map(filename => ({
      filename,
      url: artifactInfoMap[filename].url,
      checksumUrl: artifactInfoMap[filename].sha_url,
      checksumType: getChecksumType(artifactInfoMap[filename].sha_url),
      type: artifactInfoMap[filename].type,
      isOss: filename.includes('-oss-'),
      platform: getPlatform(filename),
      jdkRequired: hasNoJdkVersions ? filename.includes('-no-jdk-') : true,
    }));

    // pick the artifact we are going to use for this license/version combo
    const reqOss = license === 'oss';
    const reqPlatform = artifactSpecs.some(a => a.platform !== undefined)
      ? process.platform
      : undefined;
    const reqJdkRequired = hasNoJdkVersions ? false : true;
    const reqType = process.platform === 'win32' ? 'zip' : 'tar';

    const artifactSpec = artifactSpecs.find(
      spec =>
        spec.isOss === reqOss &&
        spec.type === reqType &&
        spec.platform === reqPlatform &&
        spec.jdkRequired === reqJdkRequired
    );

    if (!artifactSpec) {
      throw new Error(
        `Unable to determine artifact for license [${license}] and version [${version}]\n` +
          `  options: ${filenames.join(',')}`
      );
    }

    return new Artifact(artifactSpec, log);
  }

  /**
   * Fetch an Artifact from the Elasticsearch past releases url
   * @param {string} url
   * @param {ToolingLog} log
   */
  static async getArchive(url, log) {
    const shaUrl = `${url}.sha512`;

    const artifactSpec = {
      url: url,
      filename: path.basename(url),
      checksumUrl: shaUrl,
      checksumType: getChecksumType(shaUrl),
    };

    return new Artifact(artifactSpec, log);
  }

  constructor(spec, log) {
    this._spec = spec;
    this._log = log;
  }

  getUrl() {
    return this._spec.url;
  }

  getChecksumUrl() {
    return this._spec.checksumUrl;
  }

  getChecksumType() {
    return this._spec.checksumType;
  }

  getFilename() {
    return this._spec.filename;
  }

  /**
   * Download the artifact to disk, skips the download if the cache is
   * up-to-date, verifies checksum when downloaded
   * @param {string} dest
   * @return {Promise<void>}
   */
  async download(dest) {
    await retry(this._log, async () => {
      const cacheMeta = cache.readMeta(dest);
      const tmpPath = `${dest}.tmp`;

      const artifactResp = await this._download(tmpPath, cacheMeta.etag, cacheMeta.ts);
      if (artifactResp.cached) {
        return;
      }

      await this._verifyChecksum(artifactResp);

      // cache the etag for future downloads
      cache.writeMeta(dest, { etag: artifactResp.etag });

      // rename temp download to the destination location
      fs.renameSync(tmpPath, dest);
    });
  }

  /**
   * Fetch the artifact with an etag
   * @param {string} tmpPath
   * @param {string} etag
   * @param {string} ts
   * @return {{ cached: true }|{ checksum: string, etag: string, first500Bytes: Buffer }}
   */
  async _download(tmpPath, etag, ts) {
    const url = this.getUrl();

    if (etag) {
      this._log.info('verifying cache of %s', chalk.bold(url));
    } else {
      this._log.info('downloading artifact from %s', chalk.bold(url));
    }

    const abc = new AbortController();
    const resp = await fetch(url, {
      signal: abc.signal,
      headers: {
        'If-None-Match': etag,
      },
    });

    if (resp.status === 304) {
      this._log.info('etags match, reusing cache from %s', chalk.bold(ts));

      abc.abort();
      return {
        cached: true,
      };
    }

    if (!resp.ok) {
      abc.abort();
      throw new Error(
        `Unable to download elasticsearch snapshot: ${resp.statusText}${headersToString(
          resp.headers,
          '  '
        )}`
      );
    }

    if (etag) {
      this._log.info('cache invalid, redownloading');
    }

    const hash = createHash(this.getChecksumType());
    let first500Bytes = Buffer.alloc(0);
    let contentLength = 0;

    mkdirp.sync(path.dirname(tmpPath));
    await asyncPipeline(
      resp.body,
      new Transform({
        transform(chunk, encoding, cb) {
          contentLength += Buffer.byteLength(chunk);

          if (first500Bytes.length < 500) {
            first500Bytes = Buffer.concat(
              [first500Bytes, chunk],
              first500Bytes.length + chunk.length
            ).slice(0, 500);
          }

          hash.update(chunk, encoding);
          cb(null, chunk);
        },
      }),
      fs.createWriteStream(tmpPath)
    );

    return {
      checksum: hash.digest('hex'),
      etag: resp.headers.get('etag'),
      contentLength,
      first500Bytes,
      headers: resp.headers,
    };
  }

  /**
   * Verify the checksum of the downloaded artifact with the checksum at checksumUrl
   * @param {{ checksum: string, contentLength: number, first500Bytes: Buffer }} artifactResp
   * @return {Promise<void>}
   */
  async _verifyChecksum(artifactResp) {
    this._log.info('downloading artifact checksum from %s', chalk.bold(this.getChecksumUrl()));

    const abc = new AbortController();
    const resp = await fetch(this.getChecksumUrl(), {
      signal: abc.signal,
    });

    if (!resp.ok) {
      abc.abort();
      throw new Error(
        `Unable to download elasticsearch checksum: ${resp.statusText}${headersToString(
          resp.headers,
          '  '
        )}`
      );
    }

    // in format of stdout from `shasum` cmd, which is `<checksum>   <filename>`
    const [expectedChecksum] = (await resp.text()).split(' ');
    if (artifactResp.checksum !== expectedChecksum) {
      const len = Buffer.byteLength(artifactResp.first500Bytes);
      const lenString = `${len} / ${artifactResp.contentLength}`;

      throw createCliError(
        `artifact downloaded from ${this.getUrl()} does not match expected checksum\n` +
          `  expected: ${expectedChecksum}\n` +
          `  received: ${artifactResp.checksum}\n` +
          `  headers: ${headersToString(artifactResp.headers, '    ')}\n` +
          `  content[${lenString} base64]: ${artifactResp.first500Bytes.toString('base64')}`
      );
    }

    this._log.info('checksum verified');
  }
};
