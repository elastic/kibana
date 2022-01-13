/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { copyFile } from 'fs/promises';

import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import Mustache from 'mustache';

import { compressTar, copyAll, mkdirp, write, Config } from '../../../lib';
import { dockerfileTemplate } from './templates';
import { TemplateContext } from './template_context';

export async function bundleDockerFiles(config: Config, log: ToolingLog, scope: TemplateContext) {
  log.info(`Generating kibana${scope.imageFlavor} docker build context bundle`);
  const dockerFilesDirName = `kibana${scope.imageFlavor}-${scope.version}-docker-build-context`;
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
  if (scope.ironbank) {
    await copyFile(
      resolve(REPO_ROOT, 'licenses/ELASTIC-LICENSE-2.0.txt'),
      resolve(dockerFilesBuildDir, 'LICENSE')
    );
    const templates = ['hardening_manifest.yaml', 'README.md'];
    for (const template of templates) {
      const file = readFileSync(resolve(__dirname, 'templates/ironbank', template));
      const output = Mustache.render(file.toString(), scope);
      await write(resolve(dockerFilesBuildDir, template), output);
    }
  }

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
