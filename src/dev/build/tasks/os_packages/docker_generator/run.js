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

import { access, link, unlink, chmod } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { write, copyAll, mkdirp, exec } from '../../../lib';
import * as dockerTemplates from './templates';
import { bundleDockerFiles } from './bundle_dockerfiles';

const accessAsync = promisify(access);
const linkAsync = promisify(link);
const unlinkAsync = promisify(unlink);
const chmodAsync = promisify(chmod);

export async function runDockerGenerator(config, log, build) {
  const license = build.isOss() ? 'ASL 2.0' : 'Elastic License';
  const imageFlavor = build.isOss() ? '-oss' : '';
  const imageTag = 'docker.elastic.co/kibana/kibana';
  const versionTag = config.getBuildVersion();
  const artifactTarball = `kibana${ imageFlavor }-${ versionTag }-linux-x86_64.tar.gz`;
  const artifactsDir = config.resolveFromTarget('.');
  const dockerBuildDir = config.resolveFromRepo('build', 'kibana-docker', build.isOss() ? 'oss' : 'default');
  const dockerOutputDir = config.resolveFromTarget(`kibana${ imageFlavor }-${ versionTag }-docker.tar.gz`);
  const scope = {
    artifactTarball,
    imageFlavor,
    versionTag,
    license,
    artifactsDir,
    imageTag,
    dockerBuildDir,
    dockerOutputDir
  };

  // Verify if we have the needed kibana target in order
  // to build the kibana docker image.
  // Also create the docker build target folder
  // and  delete the current linked target into the
  // kibana docker build folder if we have one.
  try {
    await accessAsync(resolve(artifactsDir, artifactTarball));
    await mkdirp(dockerBuildDir);
    await unlinkAsync(resolve(dockerBuildDir, artifactTarball));
  } catch (e) {
    if (e && e.code === 'ENOENT' && e.syscall === 'access') {
      throw new Error(
        `Kibana linux target (${ artifactTarball }) is needed in order to build ${''
        }the docker image. None was found at ${ artifactsDir }`
      );
    }
  }

  // Create the kibana linux target inside the
  // Kibana docker build
  await linkAsync(
    resolve(artifactsDir, artifactTarball),
    resolve(dockerBuildDir, artifactTarball),
  );

  // Write all the needed docker config files
  // into kibana-docker folder
  for (const [, dockerTemplate] of Object.entries(dockerTemplates)) {
    await write(resolve(dockerBuildDir, dockerTemplate.name), dockerTemplate.generator(scope));
  }

  // Copy all the needed resources into kibana-docker folder
  // in order to build the docker image accordingly the dockerfile defined
  // under templates/kibana_yml.template/js
  await copyAll(
    config.resolveFromRepo('src/dev/build/tasks/os_packages/docker_generator/resources'),
    dockerBuildDir,
  );

  // Build docker image into the target folder
  // In order to do this we just call the file we
  // created from the templates/build_docker_sh.template.js
  // and we just run that bash script
  await chmodAsync(`${resolve(dockerBuildDir, 'build_docker.sh')}`, '755');
  await exec(log, `./build_docker.sh`, [], {
    cwd: dockerBuildDir,
    level: 'info',
  });

  // Pack Dockerfiles and create a target for them
  await bundleDockerFiles(config, log, build, scope);
}
