import { dirname, extname, basename } from 'path';

import { mkdirp, exec } from '../lib';

export const CreateArchivesTask = {
  description: 'Creating the archives for each platform',

  async run(config, log, build) {
    await Promise.all(config.getPlatforms().map(async platform => {
      const source = build.resolvePathForPlatform(platform, '.');
      const destination = build.getPlatformArchivePath(platform);

      log.info('archiving', source, 'to', destination);

      await mkdirp(dirname(destination));

      const cwd = dirname(source);
      const sourceName = basename(source);

      switch (extname(destination)) {
        case '.zip':
          await exec(log, 'zip', ['-rq', '-ll', destination, sourceName], { cwd });
          break;

        case '.gz':
          const args = ['-zchf', destination, sourceName];

          // Add a flag to handle filepaths with colons (i.e. C://...) on windows
          if (config.getPlatformForThisOs().isWindows()) {
            args.push('--force-local');
          }

          await exec(log, 'tar', args, { cwd });
          break;

        default:
          throw new Error(`Unexpected extension for archive destination: ${destination}`);
      }
    }));
  }
};
