/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { deleteAll, Task } from '../../lib';

export const CleanNodeBuilds: Task = {
  description: 'Cleaning npm from node',

  async run(config, log, build) {
    for (const platform of config.getNodePlatforms()) {
      await deleteAll(
        [
          build.resolvePathForPlatform(platform, 'node/lib/node_modules'),
          build.resolvePathForPlatform(platform, 'node/bin/npm'),
          build.resolvePathForPlatform(platform, 'node/bin/npx'),
        ],
        log
      );
    }
  },
};
