/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { copyAll, Task } from '../../lib';

export const CopyBinScripts: Task = {
  description: 'Copying bin scripts into platform-generic build directory',

  async run(config, log, build) {
    await copyAll(
      config.resolveFromRepo('src/dev/build/tasks/bin/scripts'),
      build.resolvePath('bin')
    );
  },
};
