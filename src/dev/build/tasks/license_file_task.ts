/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { write, read, Task } from '../lib';

const LICENSE_SEPARATOR = `\n------------------------------------------------------------------------\n\n`;

export const UpdateLicenseFile: Task = {
  description: 'Updating LICENSE.txt file',

  async run(config, log, build) {
    const elasticLicense = await read(config.resolveFromRepo('licenses/ELASTIC-LICENSE.txt'));
    if (build.isOss()) {
      const ssplLicense = await read(config.resolveFromRepo('licenses/SSPL-LICENSE.txt'));
      log.info('Copying dual-license to LICENSE.txt');
      await write(
        build.resolvePath('LICENSE.txt'),
        ssplLicense + LICENSE_SEPARATOR + elasticLicense
      );
    } else {
      log.info('Copying Elastic license to LICENSE.txt');
      await write(build.resolvePath('LICENSE.txt'), elasticLicense);
    }
  },
};
