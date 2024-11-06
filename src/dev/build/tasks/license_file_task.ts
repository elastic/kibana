/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { write, read, Task } from '../lib';

export const UpdateLicenseFile: Task = {
  description: 'Updating LICENSE.txt file',

  async run(config, log, build) {
    const elasticLicense = await read(config.resolveFromRepo('licenses/ELASTIC-LICENSE-2.0.txt'));

    log.info('Copying Elastic license to LICENSE.txt');
    await write(build.resolvePath('LICENSE.txt'), elasticLicense);
  },
};
