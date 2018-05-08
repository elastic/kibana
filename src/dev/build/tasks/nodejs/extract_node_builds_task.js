import { resolve } from 'path';

import { copy, untar } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';

export const ExtractNodeBuildsTask = {
  global: true,
  description: 'Extracting node.js builds for all platforms',
  async run(config) {
    await Promise.all(
      config.getPlatforms().map(async platform => {
        const { downloadPath, extractDir } = getNodeDownloadInfo(config, platform);

        // windows executable is not extractable, it's just a .exe file
        if (platform.isWindows()) {
          return await copy(downloadPath, resolve(extractDir, 'node.exe'));
        }

        // all other downloads are tarballs
        await untar(downloadPath, extractDir, {
          strip: 1
        });
      })
    );
  },
};
