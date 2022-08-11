/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { promisify } from 'util';

import { CiStatsMetric } from '@kbn/ci-stats-reporter';

import { mkdirp, compressTar, compressZip, Task } from '../lib';

const asyncStat = promisify(Fs.stat);

export const CreateArchives: Task = {
  description: 'Creating the archives for each platform',

  async run(config, log, build) {
    const archives = [];

    // archive one at a time, parallel causes OOM sometimes
    for (const platform of config.getTargetPlatforms()) {
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
                  level: 9,
                },
              },
              createRootDirectory: true,
              rootDirectoryName: build.getRootDirectory(),
            }),
          });
          break;

        case '.gz':
          archives.push({
            format: 'tar',
            path: destination,
            fileCount: await compressTar({
              source,
              destination,
              archiverOptions: {
                gzip: true,
                gzipOptions: {
                  level: 9,
                },
              },
              createRootDirectory: true,
              rootDirectoryName: build.getRootDirectory(),
            }),
          });
          break;

        default:
          throw new Error(`Unexpected extension for archive destination: ${destination}`);
      }
    }

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
