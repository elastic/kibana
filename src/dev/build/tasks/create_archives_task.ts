/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { promisify } from 'util';

import type { CiStatsMetric } from '@kbn/ci-stats-reporter';

import type { Task } from '../lib';
import { mkdirp, exec, compressTar, compressZip } from '../lib';

interface Archive {
  format: string;
  path: string;
  fileCount: number;
}

const asyncStat = promisify(Fs.stat);

export const CreateArchives: Task = {
  description: 'Creating the archives for each platform',

  async run(config, log, build) {
    const archives: Archive[] = [];

    await Promise.allSettled(
      config.getTargetPlatforms().map(async (platform) => {
        const source = build.resolvePathForPlatform(platform, '.');
        const destination = build.getPlatformArchivePath(platform);

        log.info('archiving', source, 'to', destination);

        await mkdirp(Path.dirname(destination));

        switch (Path.extname(destination)) {
          case '.zip':
            archives.push({
              format: 'zip',
              path: destination,
              fileCount: await compressZip({
                source,
                destination,
                archiverOptions: {
                  zlib: {
                    level: config.isRelease ? 9 : 6,
                  },
                },
                createRootDirectory: true,
                rootDirectoryName: build.getRootDirectory(platform),
              }),
            });
            break;

          case '.gz':
            archives.push({
              format: 'tar.gz',
              path: destination,
              fileCount: await compressTar({
                source,
                destination,
                gzipLevel: config.isRelease ? 9 : 6,
                createRootDirectory: true,
                rootDirectoryName: build.getRootDirectory(platform),
              }),
            });
            break;

          case '.zst': {
            const basename = Path.basename(source);
            const dirname = Path.dirname(source);
            await exec(
              log,
              'tar',
              [
                '-c',
                '-I',
                'zstd -12 -T0',
                '-f',
                destination,
                basename,
                '--transform',
                `s/${basename}/${build.getRootDirectory(platform)}/`,
              ],
              {
                level: 'info',
                cwd: dirname,
              }
            );
            archives.push({
              format: 'tar.zst',
              path: destination,
              fileCount: Fs.readdirSync(source, { recursive: true, withFileTypes: true }).filter(
                (f) => f.isFile()
              ).length,
            });
            break;
          }

          default:
            throw new Error(`Unexpected extension for archive destination: ${destination}`);
        }
      })
    );

    const metrics: CiStatsMetric[] = [];
    for (const { format, path, fileCount } of archives) {
      metrics.push({
        group: `distributable size`,
        id: format,
        value: (await asyncStat(path)).size,
      });

      metrics.push({
        group: 'distributable file count',
        id: 'default',
        value: fileCount,
      });
    }
    log.debug('archive metrics:', metrics);

    // FLAKY: https://github.com/elastic/kibana/issues/87529
    // await CiStatsReporter.fromEnv(log).metrics(metrics);
  },
};
