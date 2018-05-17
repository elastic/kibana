import { download } from './download';
import { getNodeShasums } from './node_shasums';
import { getNodeDownloadInfo } from './node_download_info';

export const DownloadNodeBuildsTask = {
  global: true,
  description: 'Downloading node.js builds for all platforms',
  async run(config, log) {
    const shasums = await getNodeShasums(config.getNodeVersion());

    await Promise.all(
      config.getPlatforms().map(async platform => {
        const { url, downloadPath, downloadName } = getNodeDownloadInfo(config, platform);
        await download({
          log,
          url,
          sha256: shasums[downloadName],
          destination: downloadPath,
          retries: 3,
        });
      })
    );
  },
};
