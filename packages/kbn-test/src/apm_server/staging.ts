/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';
import { inspect } from 'util';

import { ToolingLog } from '@kbn/dev-utils';
import execa from 'execa';
import globby from 'globby';

import { STAGING_DIR } from './paths';
import { SnapshotBuild } from './snapshot_build';
import { PLATFORMS } from './platforms';
import { downloadAndValidate, downloadText } from './download';
import { isExistingAndValid } from './checksum';
import { ChecksumFile } from './checksum_file';
import { createUrlResolver } from './url_resolver';

const resolveBucketUrl = createUrlResolver(new URL('gs://apm-server-snapshots'));

export class Staging {
  constructor(private readonly log: ToolingLog) {}

  async downloadBuilds(snapshot: SnapshotBuild) {
    this.log.debug('clearing', STAGING_DIR);
    await Fs.rm(STAGING_DIR, { recursive: true, force: true });

    this.log.debug('recreating', STAGING_DIR);
    await Fs.mkdir(STAGING_DIR, { recursive: true });

    for (const platform of PLATFORMS) {
      this.log.debug('downloading', platform.archiveName);
      this.log.indent(4);
      try {
        const pkg = platform.getApiPackage(snapshot.apmPackages);

        if (!pkg) {
          if (platform.optional) {
            this.log.debug(
              `skipping optional platform [${platform.archiveName}] which has no built package`
            );
            continue;
          }

          const debug = inspect(snapshot.apmPackages, { depth: Infinity, colors: true });
          throw new Error(`unable to find package for [${platform.archiveName}] in:\n${debug}`);
        }

        const target = Path.resolve(STAGING_DIR, snapshot.id, platform.archiveName);

        this.log.debug('fetching checksum');

        await downloadAndValidate(this.log, {
          url: pkg.url,
          checksum: new ChecksumFile(await downloadText(this.log, pkg.sha_url)),
          targetPath: target,
        });
      } finally {
        this.log.indent(-4);
      }
    }

    await Fs.writeFile(Path.resolve(STAGING_DIR, 'LATEST'), snapshot.id);
  }

  async validateAndRead() {
    const artifacts: string[] = [];

    let buildId;
    try {
      this.log.debug('reading build id');
      const path = Path.resolve(STAGING_DIR, 'LATEST');
      buildId = await Fs.readFile(path, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('missing `LATEST` file in staging directory containing the build id');
      }

      throw error;
    }

    for (const platform of PLATFORMS) {
      this.log.debug('validating download of', platform.archiveName);
      this.log.indent(4);
      try {
        const path = Path.resolve(STAGING_DIR, buildId, platform.archiveName);
        if (await isExistingAndValid(this.log, path)) {
          this.log.debug(`artifacts for [${platform.archiveName}] are valid`);
          artifacts.push(path, `${path}.sha512`);
        } else if (platform.optional) {
          this.log.debug(
            `artifacts for [${platform.archiveName}] are missing or invalid, but it's optional so ignoring`
          );
          continue;
        } else {
          throw new Error(
            `artifacts for [${platform.archiveName}] are not valid or missing, try downloading to staging again`
          );
        }
      } finally {
        this.log.indent(-4);
      }
    }

    const allFiles = await globby(['**/*'], {
      absolute: true,
      cwd: Path.resolve(STAGING_DIR, buildId),
    });

    const missingFiles = artifacts.filter((path) => !allFiles.includes(path));
    if (missingFiles.length) {
      throw new Error(`missing files in snapshot directory:\n - ${missingFiles.join('\n - ')}`);
    }

    const extraFiles = allFiles.filter((path) => !artifacts.includes(path));
    if (extraFiles.length) {
      throw new Error(`unexpected files in snapshot directory:\n - ${extraFiles.join('\n - ')}`);
    }

    return { buildId, artifacts };
  }

  async upload(branch: string, buildId: string) {
    await execa('gsutil', ['cp', '-r', buildId, resolveBucketUrl`${branch}/`], {
      stdio: 'inherit',
      cwd: STAGING_DIR,
    });
  }

  async promote(branch: string) {
    await execa('gsutil', ['cp', 'LATEST', resolveBucketUrl`${branch}/`], {
      stdio: 'inherit',
      cwd: STAGING_DIR,
    });
  }
}
