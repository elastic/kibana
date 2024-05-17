/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { copyFile } from 'fs/promises';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import Mustache from 'mustache';

import { Config, compressTar, copyAll, mkdirp, write } from '../../../lib';
import { TemplateContext } from './template_context';
import { dockerfileTemplate } from './templates';

export async function bundleDockerFiles(config: Config, log: ToolingLog, scope: TemplateContext) {
  log.info(`Generating kibana${scope.imageFlavor} docker build context bundle`);
  const dockerFilesDirName = `kibana${scope.imageFlavor}-${scope.version}-docker-build-context`;
  const dockerFilesBuildDir = resolve(scope.dockerBuildDir, dockerFilesDirName);
  const dockerFilesOutputDir = config.resolveFromTarget(`${dockerFilesDirName}.tar.gz`);
  const dockerContextUseLocalArtifact = config.getDockerContextUseLocalArtifact();

  // Create dockerfiles dir inside docker build dir
  await mkdirp(dockerFilesBuildDir);

  // Create a release Dockerfile
  await write(
    resolve(dockerFilesBuildDir, dockerfileTemplate.name),
    dockerfileTemplate.generator({
      ...scope,
      usePublicArtifact:
        dockerContextUseLocalArtifact !== null ? !dockerContextUseLocalArtifact : true,
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
  if (scope.fips) {
    await copyAll(
      resolve(scope.dockerBuildDir, 'openssl'),
      resolve(dockerFilesBuildDir, 'openssl')
    );
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
