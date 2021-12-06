/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mkdirp, Task } from '../lib';

export const CreateEmptyDirsAndFiles: Task = {
  description: 'Creating some empty directories and files to prevent file-permission issues',

  async run(config, log, build) {
    await Promise.all([
      mkdirp(build.resolvePath('plugins')),
      mkdirp(build.resolvePath('data')),
      mkdirp(build.resolvePath('logs')),
    ]);
  },
};
