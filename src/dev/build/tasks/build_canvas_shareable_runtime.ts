/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import del from 'del';
import { Task, exec } from '../lib';

export const BuildCanvasShareableRuntime: Task = {
  description: 'Build Canvas shareable runtime',

  async run(config, log, build) {
    await del(config.resolveFromRepo('x-pack/plugins/canvas/shareable_runtime/build'));

    await exec(log, process.execPath, ['plugins/canvas/scripts/shareable_runtime'], {
      cwd: config.resolveFromRepo('x-pack'),
      level: 'info',
    });
  },
};
