/*
 * Placeholder dual-license header
 */

import { write, read, Task } from '../lib';

export const UpdateLicenseFile: Task = {
  description: 'Updating LICENSE.txt file',

  async run(config, log, build) {
    if (build.isOss()) {
      log.info('Copying dual-license to LICENSE.txt');
      await write(
        build.resolvePath('LICENSE.txt'),
        await read(config.resolveFromRepo('licenses/DUAL-LICENSE.txt'))
      );
    } else {
      log.info('Copying Elastic license to LICENSE.txt');
      await write(
        build.resolvePath('LICENSE.txt'),
        await read(config.resolveFromRepo('licenses/ELASTIC-LICENSE.txt'))
      );
    }
  },
};
