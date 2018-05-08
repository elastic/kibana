import { copyAll } from '../lib';
import { getNodeDownloadInfo } from './nodejs';

export const CreateArchivesSourcesTask = {
  description: 'Creating platform-specific archive source directories',
  async run(config, log, build) {
    await Promise.all(config.getPlatforms().map(async platform => {
      // copy all files from generic build source directory into platform-specific build directory
      await copyAll(
        build.resolvePath('.'),
        build.resolvePathForPlatform(platform, '.'),
        {
          select: [
            '**/*',
            '!node_modules/**',
          ],
          dot: true,
        },
      );

      const currentTime = new Date();
      await copyAll(
        build.resolvePath('node_modules'),
        build.resolvePathForPlatform(platform, 'node_modules'),
        {
          dot: true,
          time: currentTime
        },
      );
      log.debug('Generic build source copied into', platform.getName(), 'specific build directory');

      // copy node.js install
      await copyAll(
        getNodeDownloadInfo(config, platform).extractDir,
        build.resolvePathForPlatform(platform, 'node')
      );
      log.debug('Node.js copied into', platform.getName(), 'specific build directory');
    }));
  }
};
