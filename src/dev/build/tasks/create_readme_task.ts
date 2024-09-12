/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { write, read, Task } from '../lib';

export const CreateReadme: Task = {
  description: 'Creating README.md file',

  async run(config, log, build) {
    const readme = await read(config.resolveFromRepo('README.md'));

    await write(
      build.resolvePath('README.txt'),
      readme.replace(/\s##\sSnapshot\sBuilds[\s\S]*/, '')
    );
  },
};
