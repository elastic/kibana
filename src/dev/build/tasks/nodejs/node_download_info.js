import { basename } from 'path';

export function getNodeDownloadInfo(config, platform) {
  const version = config.getNodeVersion();
  const arch = platform.getNodeArch();

  const downloadName = platform.isWindows()
    ? 'win-x64/node.exe'
    : `node-v${version}-${arch}.tar.gz`;

  const url = `https://nodejs.org/dist/v${version}/${downloadName}`;
  const downloadPath = config.resolveFromRepo('.node_binaries', version, basename(downloadName));
  const extractDir = config.resolveFromRepo('.node_binaries', version, arch);

  return {
    url,
    downloadName,
    downloadPath,
    extractDir
  };
}
