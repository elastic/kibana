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

import { dirname, extname, basename } from 'path';

import { mkdirp, exec } from '../lib';

export const CreateArchivesTask = {
  description: 'Creating the archives for each platform',

  async run(config, log, build) {
    await Promise.all(config.getTargetPlatforms().map(async platform => {
      const source = build.resolvePathForPlatform(platform, '.');
      const destination = build.getPlatformArchivePath(platform);

      log.info('archiving', source, 'to', destination);

      await mkdirp(dirname(destination));

      const cwd = dirname(source);
      const sourceName = basename(source);

      switch (extname(destination)) {
        case '.zip':
          await exec(log, 'zip', ['-rq', '-ll', destination, sourceName], { cwd });
          break;

        case '.gz':
          const args = ['-zchf', destination, sourceName];

          // Add a flag to handle filepaths with colons (i.e. C://...) on windows
          if (config.getPlatformForThisOs().isWindows()) {
            args.push('--force-local');
          }

          await exec(log, 'tar', args, { cwd });
          break;

        default:
          throw new Error(`Unexpected extension for archive destination: ${destination}`);
      }
    }));
  }
};
