/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';
import { compress, copyAll, mkdirp, write } from '../../../lib';
import { dockerfileTemplate } from './templates';

export async function bundleDockerFiles(config, log, build, scope) {
  log.info(`Generating kibana${scope.imageFlavor} docker build context bundle`);

  const dockerFilesDirName = `kibana${scope.imageFlavor}-${scope.versionTag}-docker-build-context`;
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
  await compress(
    'tar',
    {
      archiverOptions: {
        gzip: true,
        gzipOptions: {
          level: 9,
        },
      },
      createRootDirectory: false,
    },
    dockerFilesBuildDir,
    dockerFilesOutputDir
  );
}
