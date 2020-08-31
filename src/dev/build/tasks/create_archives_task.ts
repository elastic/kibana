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

import Path from 'path';
import Fs from 'fs';
import { promisify } from 'util';

import { CiStatsReporter, CiStatsMetrics } from '@kbn/dev-utils';

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
            }),
          });
          break;

        default:
          throw new Error(`Unexpected extension for archive destination: ${destination}`);
      }
    }

    const metrics: CiStatsMetrics = [];
    for (const { format, path, fileCount } of archives) {
      metrics.push({
        group: `${build.isOss() ? 'oss ' : ''}distributable size`,
        id: format,
        value: (await asyncStat(path)).size,
      });

      metrics.push({
        group: `${build.isOss() ? 'oss ' : ''}distributable file count`,
        id: 'total',
        value: fileCount,
      });
    }
    log.debug('archive metrics:', metrics);

    await CiStatsReporter.fromEnv(log).metrics(metrics);
  },
};
