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
const { createCliError } = require('./errors');

const TEST_ES_SNAPSHOT_VERSION = process.env.TEST_ES_SNAPSHOT_VERSION
  ? process.env.TEST_ES_SNAPSHOT_VERSION
  : 'latest';

function getChecksumType(checksumUrl) {
  if (checksumUrl.endsWith('.sha512')) {
    return 'sha512';
  }

  throw new Error(`unable to determine checksum type: ${checksumUrl}`);
}

exports.Artifact = class Artifact {
  /**
   * Fetch an Artifact from the Artifact API for a license level and version
   * @param {('oss'|'basic'|'trial')} license
   * @param {string} version
   * @param {ToolingLog} log
   */
  static async get(license, version, log) {
    const urlVersion = `${encodeURIComponent(version)}-SNAPSHOT`;
    const urlBuild = encodeURIComponent(TEST_ES_SNAPSHOT_VERSION);
    const url = `${V1_VERSIONS_API}/${urlVersion}/builds/${urlBuild}/projects/elasticsearch`;

    log.info('downloading artifact info from %s', chalk.bold(url));
    const abc = new AbortController();
    const resp = await fetch(url, { signal: abc.signal });
    const json = await resp.text();

    if (resp.status === 404) {
      abc.abort();
      throw createCliError(`Snapshots for ${version} are not available`);
    }

    if (!resp.ok) {
      abc.abort();
      throw new Error(`Unable to read artifact info from ${url}: ${resp.statusText}\n  ${json}`);
    }

    const isOss = license === 'oss';
    const type = process.platform === 'win32' ? 'zip' : 'tar';

    const {
      project: { packages: artifacts },
    } = JSON.parse(json);

    const keys = Object.keys(artifacts);
    const key = keys.find(key => artifacts[key].type === type && isOss === key.includes('-oss-'));

    if (!key) {
      throw new Error(
        `Unable to determine artifact for license [${license}] and version [${version}]\n` +
          `  options: ${keys.join(',')}`
      );
    }

    return new Artifact(
      license,
      version,
      key,
      artifacts[key].url,
      artifacts[key].sha_url,
      getChecksumType(artifacts[key].sha_url),
      log
    );
  }

  constructor(license, version, key, url, checksumUrl, checksumType, log) {
    this.license = license;
    this.version = version;
    this.key = key;
    this.url = url;
    this.checksumUrl = checksumUrl;
    this.checksumType = checksumType;
    this.log = log;
  }

  /**
   * Download the artifact to disk, skips the download if the cache is
   * up-to-date, verifies checksum when downloaded
   * @param {string} dest
   * @return {Promise<void>}
   */
  async download(dest) {
    const cacheMeta = cache.readMeta(dest);
    const tmpPath = `${dest}.tmp`;

    const artifactResp = await this._request(cacheMeta.etag);
    if (artifactResp.cached) {
      this.log.info('etags match, using cache from %s', chalk.bold(cacheMeta.ts));
      return;
    }

    const checksum = await this._saveTemp(artifactResp, tmpPath);

    await this._verifyChecksum(checksum);

    // cache the etag for future downloads
    cache.writeMeta(dest, { etag: artifactResp.headers.get('etag') });

    // rename temp download to the destination location
    fs.renameSync(tmpPath, dest);
  }

  /**
   * Fetch the artifact with an etag
   * @param {string} etag
   * @return {{ cached: true }|IncommingMessage}
   */
  async _request(etag) {
    const abc = new AbortController();
    const resp = await fetch(this.url, {
      signal: abc.signal,
      headers: {
        'If-None-Match': etag,
      },
    });

    if (resp.status === 304) {
      abc.abort();
      return {
        cached: true,
      };
    }

    if (!resp.ok) {
      abc.abort();
      throw new Error(`Unable to download elasticsearch snapshot: ${resp.statusText}`);
    }

    return resp;
  }

  /**
   * Download the artifact to a temporary file on the filesystem
   * @param {IncommingMessage} artifactResp
   * @param {string} tmpPath
   * @return {Promise<string>}
   */
  async _saveTemp(artifactResp, tmpPath) {
    this.log.info('downloading artifact from %s', chalk.bold(this.url));

    const hash = createHash(this.checksumType);

    mkdirp.sync(path.dirname(tmpPath));
    await asyncPipeline(
      artifactResp.body,
      new Transform({
        transform(chunk, encoding, cb) {
          hash.update(chunk, encoding);
          cb(null, chunk);
        },
      }),
      fs.createWriteStream(tmpPath)
    );

    return hash.digest('hex');
  }

  /**
   * Verify the checksum of the downloaded artifact with the checksum at checksumUrl
   * @param {string} actualChecksum
   * @return {Promise<void>}
   */
  async _verifyChecksum(actualChecksum) {
    this.log.info('downloading artifact checksum from %s', chalk.bold(this.url));

    const abc = new AbortController();
    const resp = await fetch(this.checksumUrl, {
      signal: abc.signal,
    });

    if (!resp.ok) {
      abc.abort();
      throw new Error(`Unable to download elasticsearch checksum: ${resp.statusText}`);
    }

    // in format of stdout from `shasum` cmd, which is `<checksum>   <filename>`
    const [expectedChecksum] = (await resp.text()).split(' ');
    if (actualChecksum !== expectedChecksum) {
      throw createCliError(
        `artifact downloaded from ${this.url} does not match expected checksum\n` +
          `  expected: ${expectedChecksum}\n` +
          `  received: ${actualChecksum}`
      );
    }

    this.log.info('checksum verified');
  }
};
