/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mkdirp, compressTar, Task, copyAll } from '../lib';

export const CreateCdnAssets: Task = {
  description: 'Creating CDN assets',

  async run(config, log, build) {
    const buildSource = build.resolvePath();
    const assets = config.resolveFromRepo('build', 'cdn-assets');
    await mkdirp(assets);

    copyAll(buildSource, assets, {
      select: ['**/target/public/*'],
    });
    await compressTar({
      source: assets,
      destination: config.resolveFromTarget(`kibana-${config.getBuildVersion()}-cdn-assets.tar.gz`),
      archiverOptions: {
        gzip: true,
        gzipOptions: {
          level: 9,
        },
      },
      createRootDirectory: true,
      rootDirectoryName: build.getRootDirectory(),
    });
  },
};
