/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { read, Task } from '../lib';

export const UuidVerification: Task = {
  description: 'Verify that no UUID file is baked into the build',

  async run(config, log, build) {
    const uuidFilePath = build.resolvePath('data', 'uuid');
    await read(uuidFilePath).then(
      function success() {
        throw new Error(`UUID file should not exist at [${uuidFilePath}]`);
      },
      function error(err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    );
  },
};
