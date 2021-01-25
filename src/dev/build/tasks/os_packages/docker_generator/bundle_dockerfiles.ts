/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';

import { ToolingLog } from '@kbn/dev-utils';

import { compressTar, copyAll, mkdirp, write, Config } from '../../../lib';
import { dockerfileTemplate } from './templates';
import { TemplateContext } from './template_context';

export async function bundleDockerFiles(config: Config, log: ToolingLog, scope: TemplateContext) {
  log.info(
    `Generating kibana${scope.imageFlavor}${scope.ubiImageFlavor} docker build context bundle`
  );

  const dockerFilesDirName = `kibana${scope.imageFlavor}${scope.ubiImageFlavor}-${scope.version}-docker-build-context`;
  const dockerFilesBuildDir = resolve(scope.dockerBuildDir, dockerFilesDirName);
  const dockerFilesOutputDir = config.resolveFromTarget(`${dockerFilesDirName}.tar.gz`);

  // Create dockerfiles dir inside docker build dir
  await mkdirp(dockerFilesBuildDir);

  // Create a release Dockerfile
  await write(
    resolve(dockerFilesBuildDir, dockerfileTemplate.name),
    dockerfileTemplate.generator({
      ...scope,
      usePublicArtifact: true,
    })
  );

  // Move relevant docker build files inside
  // dockerfiles folder
  await copyAll(resolve(scope.dockerBuildDir, 'bin'), resolve(dockerFilesBuildDir, 'bin'));
  await copyAll(resolve(scope.dockerBuildDir, 'config'), resolve(dockerFilesBuildDir, 'config'));

  // Compress dockerfiles dir created inside
  // docker build dir as output it as a target
  // on targets folder
  await compressTar({
    source: dockerFilesBuildDir,
    destination: dockerFilesOutputDir,
    archiverOptions: {
      gzip: true,
      gzipOptions: {
        level: 9,
      },
    },
    createRootDirectory: false,
  });
}
