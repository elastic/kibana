import { getFileHash } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';
import { getNodeShasums } from './node_shasums';

export const VerifyExistingNodeBuildsTask = {
  global: true,
  description: 'Verifying previously downloaded node.js build for all platforms',
  async run(config, log) {
    const platforms = config.getPlatforms();
    const shasums = await getNodeShasums(config.getNodeVersion());

    await Promise.all(
      platforms.map(async (platform) => {
        const { downloadPath, downloadName } = getNodeDownloadInfo(config, platform);

        const sha256 = await getFileHash(downloadPath, 'sha256');
        if (sha256 !== shasums[downloadName]) {
          throw new Error(
            `Download at ${downloadPath} does not match expected checksum ${sha256}`
          );
        }

        log.success(`Download for ${platform.getNodeArch()} matches checksum`);
      })
    );
  },
};
