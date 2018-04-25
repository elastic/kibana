import { write, read } from '../lib';

export const UpdateLicenseFileTask = {
  description: 'Updating LICENSE.txt file',

  async run(config, log, build) {
    if (build.isOss()) {
      log.info('Copying Apache 2.0 license to LICENSE.txt');
      await write(
        build.resolvePath('LICENSE.txt'),
        await read(config.resolveFromRepo('licenses/APACHE-LICENSE-2.0.txt'))
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
