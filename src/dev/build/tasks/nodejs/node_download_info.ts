/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { basename } from 'path';

import { Config, Platform } from '../../lib';

export function getNodeDownloadInfo(config: Config, platform: Platform) {
  const version = config.getNodeVersion();
  const arch = platform.getNodeArch();

  const downloadName = platform.isWindows()
    ? 'win-x64/node.exe'
    : `node-v${version}-${arch}.tar.gz`;

  const url = `https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v${version}/${downloadName}`;
  const downloadPath = config.resolveFromRepo('.node_binaries', version, basename(downloadName));
  const extractDir = config.resolveFromRepo('.node_binaries', version, arch);

  return {
    url,
    downloadName,
    downloadPath,
    extractDir,
    version,
  };
}
