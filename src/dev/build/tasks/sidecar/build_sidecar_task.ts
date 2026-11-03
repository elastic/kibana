/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Task } from '../../lib';
import { exec } from '../../lib';

export const BuildSidecar: Task = {
  description: 'Cross-compiling Go sidecar binary for each target platform',

  async run(config, log, build) {
    const sidecarSourceDir = config.resolveFromRepo('src/platform/sidecar');

    for (const platform of config.getTargetPlatforms()) {
      if (platform.getVariant()) {
        continue;
      }

      const goos = platform.isWindows() ? 'windows' : platform.isLinux() ? 'linux' : 'darwin';
      const goarch = platform.getArchitecture() === 'x64' ? 'amd64' : 'arm64';
      const ext = platform.isWindows() ? '.exe' : '';
      const outputName = `kbn_sidecar${ext}`;
      const outputPath = build.resolvePathForPlatform(platform, 'bin', outputName);

      log.info(`Building sidecar for ${goos}/${goarch}`);

      await exec(log, 'go', ['build', '-o', outputPath, './cmd/kbn_sidecar/'], {
        cwd: sidecarSourceDir,
        env: { ...process.env, GOOS: goos, GOARCH: goarch, CGO_ENABLED: '0' },
      });

      log.info(`Built sidecar for ${goos}/${goarch}: ${outputPath}`);
    }
  },
};
