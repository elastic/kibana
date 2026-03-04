/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ImageBuildConfig } from './build_custom_images';
import { getRepoDir } from './build_custom_images';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

describe('build_custom_images', () => {
  describe('getRepoDir', () => {
    it('should return correct path for rust-k8s-demo', () => {
      const repoDir = getRepoDir('rust-k8s-demo');
      expect(repoDir).toBe(
        Path.join(REPO_ROOT, 'data', 'demo_environments', 'repos', 'rust-k8s-demo')
      );
    });
  });

  describe('ImageBuildConfig interface', () => {
    it('should accept config without preBuildCommand', () => {
      const config: ImageBuildConfig = {
        gitUrl: 'https://github.com/caulagi/rust-k8s-demo.git',
        images: [
          { name: 'rust-k8s-demo/frontendservice:latest', context: 'frontendservice' },
          { name: 'rust-k8s-demo/quotationservice:latest', context: 'quotationservice' },
          {
            name: 'rust-k8s-demo/databaseservice:latest',
            context: 'databaseservice',
            dockerfile: 'Dockerfile',
          },
        ],
      };
      expect(config.preBuildCommand).toBeUndefined();
      expect(config.images).toHaveLength(3);
    });
  });
});
