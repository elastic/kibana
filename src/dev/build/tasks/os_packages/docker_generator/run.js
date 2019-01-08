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
import del from 'del';
import { mkdirp, write, copyAll, exec } from '../../../lib';
import { buildDockerSHTemplate, dockerfileTemplate, kibanaYMLTemplate } from './templates';

export async function runDockerGenerator(config, log, build) {
  const imageFlavor = build.isOss() ? '-oss' : '';
  const imageTag = 'docker.elastic.co/kibana/kibana';
  const versionTag = config.getBuildVersion();
  const urlRoot = 'http://localhost:8000';
  const tarball = `kibana${ imageFlavor }-${ versionTag }-linux-x86_64.tar.gz`;
  const artifactsDir = config.resolveFromTarget('.');
  const license = build.isOss() ? 'ASL 2.0' : 'Elastic License';
  const httpD = 'kibana-docker-artifact-server';
  const dockerTargetDir = config.resolveFromTarget(
    `docker`
  );
  const dockerBuildDir = resolve(dockerTargetDir, 'build');
  const dockerOutput = resolve(
    dockerTargetDir,
    `kibana${ imageFlavor }-${ versionTag }-docker.tar`
  );

  // Create Docker Target Folder
  await mkdirp(dockerTargetDir);

  // Create Docker Target Temp Build Folder
  await mkdirp(dockerBuildDir);

  // Write Templates
  const scope = {
    urlRoot,
    tarball,
    imageFlavor,
    versionTag,
    license,
    artifactsDir,
    httpD,
    imageTag,
    dockerOutput
  };

  await write(resolve(dockerBuildDir, 'build_docker.sh'), buildDockerSHTemplate(scope));
  await write(resolve(dockerBuildDir, 'Dockerfile'), dockerfileTemplate(scope));
  await write(resolve(dockerBuildDir, 'config/kibana.yml'), kibanaYMLTemplate(scope));

  // Copy Resources
  await copyAll(
    config.resolveFromRepo('src/dev/build/tasks/os_packages/docker_generator/resources'),
    dockerBuildDir,
  );

  // Build Docker Image
  const args = [
    `${resolve(dockerBuildDir, 'build_docker.sh')}`
  ];

  await exec(log, `sh`, args, {
    cwd: dockerBuildDir,
    level: 'info',
  });

  // Cleanup Docker Target Folder Temp Build Folder
  await del(dockerBuildDir);
}
