/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import { ToolingLog, createFailError } from '@kbn/dev-utils';

import { STAGING_DIR, ARCHIVES_DIR } from './paths';
import { getThisPlatform, Platform } from './platforms';
import { downloadAndValidate, downloadText } from './download';
import { isExistingAndValid } from './checksum';
import { ChecksumFile } from './checksum_file';
import { createUrlResolver } from './url_resolver';

const resolveUrl = createUrlResolver(
  new URL('https://storage.googleapis.com/apm-server-snapshots/')
);

export class ArchiveArtifact {
  /**
   * Get the name of the latest version of the APM server for a branch
   */
  static async forBranch(log: ToolingLog, branch: string) {
    const platform = getThisPlatform();

    log.debug('fetching latest snapshot version');
    const snapshotVersion = await downloadText(log, resolveUrl`/${branch}/LATEST`);
    const artifactUrl = resolveUrl`/${branch}/${snapshotVersion}/${platform.archiveName}`;

    log.debug('fetching checksum of latest snapshot');
    const checksum = await ChecksumFile.fromArchiveUrl(log, artifactUrl);

    return new ArchiveArtifact(
      log,
      platform,
      Path.resolve(ARCHIVES_DIR, `branch-${branch}`, platform.archiveName),
      artifactUrl,
      checksum
    );
  }

  static async fromStaging(log: ToolingLog) {
    const platform = getThisPlatform();

    let buildId;
    try {
      buildId = await Fs.readFile(Path.resolve(STAGING_DIR, 'LATEST'), 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw createFailError(
          `There doesn't seem to be a valid staging build downloaded, try running [node scripts/apm_server staging-download]`
        );
      }

      throw error;
    }

    return new ArchiveArtifact(
      log,
      platform,
      Path.resolve(STAGING_DIR, buildId, platform.archiveName)
    );
  }

  constructor(
    private readonly log: ToolingLog,
    private readonly platform: Platform,
    public readonly path: string,
    public readonly url?: string,
    public readonly checksum?: ChecksumFile
  ) {}

  public get executableName() {
    return this.platform.executableName;
  }

  async ensureDownloaded() {
    if (await isExistingAndValid(this.log, this.path, this.checksum)) {
      this.log.debug('previously downloaded artifact at', this.path, 'is valid');
      return;
    }

    if (!this.url || !this.checksum) {
      throw createFailError(
        'unable to download artifact without a url or checksum file content, do you need to run the "staging-download" command?'
      );
    }

    await downloadAndValidate(this.log, {
      url: this.url,
      checksum: this.checksum,
      targetPath: this.path,
    });
  }
}
