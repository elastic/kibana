/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { basename } from 'path';

import { Config, Platform } from '../../lib';

export function getNodeDownloadInfo(config: Config, platform: Platform) {
  const version = config.getNodeVersion();
  const arch = platform.getNodeArch();
  let variants = ['default'];
  if (platform.isLinux()) {
    variants = ['glibc-217'];
    if (platform.isServerless()) variants.push('pointer-compression');
  }

  return variants.map((variant) => {
    const downloadName = platform.isWindows()
      ? 'win-x64/node.exe'
      : `node-v${version}-${arch}.tar.gz`;

    let variantPath = '';
    if (variant === 'pointer-compression') variantPath = 'node-pointer-compression/';
    const url = `https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/${variantPath}dist/v${version}/${downloadName}`;
    const downloadPath = config.resolveFromRepo(
      '.node_binaries',
      version,
      variant,
      basename(downloadName)
    );
    const extractDir = config.resolveFromRepo('.node_binaries', version, variant, arch);

    return {
      url,
      downloadName,
      downloadPath,
      extractDir,
      variant,
      version,
    };
  });
}
