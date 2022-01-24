/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { createHash } from 'crypto';
import { pipeline, Transform } from 'stream';
import { setTimeout } from 'timers/promises';

import fetch, { Headers } from 'node-fetch';
import AbortController from 'abort-controller';
import chalk from 'chalk';
import { ToolingLog } from '@kbn/dev-utils';

import { cache } from './utils/cache';
import { resolveCustomSnapshotUrl } from './custom_snapshots';
import { createCliError, isCliError } from './errors';

const asyncPipeline = promisify(pipeline);
const DAILY_SNAPSHOTS_BASE_URL = 'https://storage.googleapis.com/kibana-ci-es-snapshots-daily';
const PERMANENT_SNAPSHOTS_BASE_URL =
  'https://storage.googleapis.com/kibana-ci-es-snapshots-permanent';

type ChecksumType = 'sha512';
export type ArtifactLicense = 'oss' | 'basic' | 'trial';

interface ArtifactManifest {
  id: string;
  bucket: string;
  branch: string;
  sha: string;
  sha_short: string;
  version: string;
  generated: string;
  archives: Array<{
    filename: string;
    checksum: string;
    url: string;
    version: string;
    platform: string;
    architecture: string;
    license: string;
  }>;
}

export interface ArtifactSpec {
  url: string;
  checksumUrl: string;
  checksumType: ChecksumType;
  filename: string;
}

interface ArtifactDownloaded {
  cached: false;
  checksum: string;
  etag?: string;
  contentLength: number;
  first500Bytes: Buffer;
  headers: Headers;
}
interface ArtifactCached {
  cached: true;
}

function getChecksumType(checksumUrl: string): ChecksumType {
  if (checksumUrl.endsWith('.sha512')) {
    return 'sha512';
  }

  throw new Error(`unable to determine checksum type: ${checksumUrl}`);
}

function headersToString(headers: Headers, indent = '') {
  return [...headers.entries()].reduce(
    (acc, [key, value]) => `${acc}\n${indent}${key}: ${value}`,
    ''
  );
}

async function retry<T>(log: ToolingLog, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt += 1;

    try {
      return await fn();
    } catch (error) {
      if (isCliError(error) || attempt >= 5) {
        throw error;
      }

      log.warning('...failure, retrying in 5 seconds:', error.message);
      await setTimeout(5000);
      log.info('...retrying');
    }
  }
}

// Setting this flag provides an easy way to run the latest un-promoted snapshot without having to look it up
function shouldUseUnverifiedSnapshot() {
  return !!process.env.KBN_ES_SNAPSHOT_USE_UNVERIFIED;
}

async function fetchSnapshotManifest(url: string, log: ToolingLog) {
  log.info('Downloading snapshot manifest from %s', chalk.bold(url));

  const abc = new AbortController();
  const resp = await retry(log, async () => await fetch(url, { signal: abc.signal }));
  const json = await resp.text();

  return { abc, resp, json };
}

async function getArtifactSpecForSnapshot(
  urlVersion: string,
  license: string,
  log: ToolingLog
): Promise<ArtifactSpec> {
  const desiredVersion = urlVersion.replace('-SNAPSHOT', '');
  const desiredLicense = license === 'oss' ? 'oss' : 'default';

  const customManifestUrl = process.env.ES_SNAPSHOT_MANIFEST;
  const primaryManifestUrl = `${DAILY_SNAPSHOTS_BASE_URL}/${desiredVersion}/manifest-latest${
    shouldUseUnverifiedSnapshot() ? '' : '-verified'
  }.json`;
  const secondaryManifestUrl = `${PERMANENT_SNAPSHOTS_BASE_URL}/${desiredVersion}/manifest.json`;

  let { abc, resp, json } = await fetchSnapshotManifest(
    customManifestUrl || primaryManifestUrl,
    log
  );

  if (!customManifestUrl && !shouldUseUnverifiedSnapshot() && resp.status === 404) {
    log.info('Daily snapshot manifest not found, falling back to permanent manifest');
    ({ abc, resp, json } = await fetchSnapshotManifest(secondaryManifestUrl, log));
  }

  if (resp.status === 404) {
    abc.abort();
    throw createCliError(`Snapshots for ${desiredVersion} are not available`);
  }

  if (!resp.ok) {
    abc.abort();
    throw new Error(`Unable to read snapshot manifest: ${resp.statusText}\n  ${json}`);
  }

  const manifest: ArtifactManifest = JSON.parse(json);
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';

  const archive = manifest.archives.find(
    (a) => a.platform === platform && a.license === desiredLicense && a.architecture === arch
  );

  if (!archive) {
    throw createCliError(
      `Snapshots are available, but couldn't find an artifact in the manifest for [${desiredLicense}, ${platform}, ${arch}]`
    );
  }

  if (archive.version !== desiredVersion) {
    log.warning(
      `Snapshot found, but version does not match Kibana. Kibana: ${desiredVersion}, Snapshot: ${archive.version}`
    );
  }

  return {
    url: archive.url,
    checksumUrl: archive.url + '.sha512',
    checksumType: 'sha512',
    filename: archive.filename,
  };
}

export class Artifact {
  /**
   * Fetch an Artifact from the Artifact API for a license level and version
   */
  static async getSnapshot(license: ArtifactLicense, version: string, log: ToolingLog) {
    const urlVersion = `${encodeURIComponent(version)}-SNAPSHOT`;

    const customSnapshotArtifactSpec = resolveCustomSnapshotUrl(urlVersion, license);
    if (customSnapshotArtifactSpec) {
      return new Artifact(log, customSnapshotArtifactSpec);
    }

    const artifactSpec = await getArtifactSpecForSnapshot(urlVersion, license, log);
    return new Artifact(log, artifactSpec);
  }

  /**
   * Fetch an Artifact from the Elasticsearch past releases url
   */
  static async getArchive(url: string, log: ToolingLog) {
    const shaUrl = `${url}.sha512`;

    return new Artifact(log, {
      url,
      filename: path.basename(url),
      checksumUrl: shaUrl,
      checksumType: getChecksumType(shaUrl),
    });
  }

  constructor(private readonly log: ToolingLog, public readonly spec: ArtifactSpec) {}

  /**
   * Download the artifact to disk, skips the download if the cache is
   * up-to-date, verifies checksum when downloaded
   */
  async download(dest: string, { useCached = false }: { useCached?: boolean } = {}) {
    await retry(this.log, async () => {
      const cacheMeta = cache.readMeta(dest);
      const tmpPath = `${dest}.tmp`;

      if (useCached) {
        if (cacheMeta.exists) {
          this.log.info(
            'use-cached passed, forcing to use existing snapshot',
            chalk.bold(cacheMeta.ts)
          );
          return;
        } else {
          this.log.info('use-cached passed but no cached snapshot found. Continuing to download');
        }
      }

      const artifactResp = await this.fetchArtifact(tmpPath, cacheMeta.etag, cacheMeta.ts);
      if (artifactResp.cached) {
        return;
      }

      await this.verifyChecksum(artifactResp);

      // cache the etag for future downloads
      cache.writeMeta(dest, { etag: artifactResp.etag });

      // rename temp download to the destination location
      fs.renameSync(tmpPath, dest);
    });
  }

  /**
   * Fetch the artifact with an etag
   */
  private async fetchArtifact(
    tmpPath: string,
    etag: string,
    ts: string
  ): Promise<ArtifactDownloaded | ArtifactCached> {
    const url = this.spec.url;

    if (etag) {
      this.log.info('verifying cache of %s', chalk.bold(url));
    } else {
      this.log.info('downloading artifact from %s', chalk.bold(url));
    }

    const abc = new AbortController();
    const resp = await fetch(url, {
      signal: abc.signal,
      headers: {
        'If-None-Match': etag,
      },
    });

    if (resp.status === 304) {
      this.log.info('etags match, reusing cache from %s', chalk.bold(ts));

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
      this.log.info('cache invalid, redownloading');
    }

    const hash = createHash(this.spec.checksumType);
    let first500Bytes = Buffer.alloc(0);
    let contentLength = 0;

    fs.mkdirSync(path.dirname(tmpPath), { recursive: true });

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
      cached: false,
      checksum: hash.digest('hex'),
      etag: resp.headers.get('etag') ?? undefined,
      contentLength,
      first500Bytes,
      headers: resp.headers,
    };
  }

  /**
   * Verify the checksum of the downloaded artifact with the checksum at checksumUrl
   */
  private async verifyChecksum(artifactResp: ArtifactDownloaded) {
    this.log.info('downloading artifact checksum from %s', chalk.bold(this.spec.checksumUrl));

    const abc = new AbortController();
    const resp = await fetch(this.spec.checksumUrl, {
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
        `artifact downloaded from ${this.spec.url} does not match expected checksum\n` +
          `  expected: ${expectedChecksum}\n` +
          `  received: ${artifactResp.checksum}\n` +
          `  headers: ${headersToString(artifactResp.headers, '    ')}\n` +
          `  content[${lenString} base64]: ${artifactResp.first500Bytes.toString('base64')}`
      );
    }

    this.log.info('checksum verified');
  }
}
