/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Mustache from 'mustache';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import globby from 'globby';
import { copyAll, Task } from '../../lib';

export const CopyBinScripts: Task = {
  description: 'Copying bin scripts into platform-specific build directory',

  async run(config, log, build) {
    const scriptsSrc = config.resolveFromRepo('src/dev/build/tasks/bin/scripts');
    for (const platform of config.getTargetPlatforms()) {
      const scriptsDest = build.resolvePathForPlatform(platform, 'bin');
      mkdirSync(scriptsDest, { recursive: true });

      if (platform.isWindows()) {
        await copyAll(scriptsSrc, scriptsDest, {
          select: ['*.bat'],
        });
      } else {
        globby
          .sync(['*'], {
            ignore: ['*.bat'],
            cwd: scriptsSrc,
          })
          .forEach((script) => {
            const template = readFileSync(join(scriptsSrc, script), { encoding: 'utf-8' });
            const output = Mustache.render(template, {
              darwin: platform.isMac(),
              linux: platform.isLinux(),
              serverless: platform.isServerless(),
              forcePointerCompression: Boolean(process.env.CI_FORCE_NODE_POINTER_COMPRESSION), // for .buildkite/pipeline-resource-definitions/kibana-pointer-compression.yml
            });
            writeFileSync(join(scriptsDest, script), output, {
              mode: '0755',
            });
          });
      }
    }
  },
};
