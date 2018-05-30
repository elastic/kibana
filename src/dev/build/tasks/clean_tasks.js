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

import { deleteAll } from '../lib';

export const CleanTask = {
  global: true,
  description: 'Cleaning artifacts from previous builds',

  async run(config, log) {
    await deleteAll(log, [
      config.resolveFromRepo('build'),
      config.resolveFromRepo('target'),
    ]);
  },
};

export const CleanPackagesTask = {
  description: 'Cleaning source for packages that are now installed in node_modules',

  async run(config, log, build) {
    await deleteAll(log, [
      build.resolvePath('packages'),
      build.resolvePath('x-pack')
    ]);
  },
};

export const CleanTypescriptTask = {
  description: 'Cleaning typescript source files that have been transpiled to JS',

  async run(config, log, build) {
    await deleteAll(log, [
      build.resolvePath('**/*.{ts,tsx,d.ts}'),
      build.resolvePath('**/tsconfig.json'),
    ]);
  },
};

export const CleanExtraFilesFromModulesTask = {
  description: 'Cleaning tests, examples, docs, etc. from node_modules',

  async run(config, log, build) {
    await deleteAll(log, [
      build.resolvePath('node_modules/**/test/**/*'),
      build.resolvePath('node_modules/**/tests/**/*'),
      build.resolvePath('node_modules/**/example/**/*'),
      build.resolvePath('node_modules/**/examples/**/*'),
    ]);
  },
};

export const CleanExtraBinScriptsTask = {
  description: 'Cleaning extra bin/* scripts from platform-specific builds',

  async run(config, log, build) {
    for (const platform of config.getPlatforms()) {
      if (platform.isWindows()) {
        await deleteAll(log, [
          build.resolvePathForPlatform(platform, 'bin', '*'),
          `!${build.resolvePathForPlatform(platform, 'bin', '*.bat')}`
        ]);
      } else {
        await deleteAll(log, [
          build.resolvePathForPlatform(platform, 'bin', '*.bat'),
        ]);
      }
    }
  }
};
