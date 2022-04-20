/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { access, link, unlink, chmod } from 'fs';
import { resolve, basename } from 'path';
import { promisify } from 'util';

import { ToolingLog, kibanaPackageJson } from '@kbn/dev-utils';

import { write, copyAll, mkdirp, exec, Config, Build } from '../../../lib';
import * as dockerTemplates from './templates';
import { TemplateContext } from './template_context';
import { bundleDockerFiles } from './bundle_dockerfiles';

const accessAsync = promisify(access);
const linkAsync = promisify(link);
const unlinkAsync = promisify(unlink);
const chmodAsync = promisify(chmod);

export async function runDockerGenerator(
  config: Config,
  log: ToolingLog,
  build: Build,
  flags: {
    architecture?: string;
    context: boolean;
    image: boolean;
    ubi?: boolean;
    ubuntu?: boolean;
    ironbank?: boolean;
    cloud?: boolean;
    dockerBuildDate?: string;
  }
) {
  let baseOSImage = '';
  if (flags.ubuntu) baseOSImage = 'ubuntu:20.04';
  if (flags.ubi) baseOSImage = 'docker.elastic.co/ubi8/ubi-minimal:latest';
  const ubiVersionTag = 'ubi8';

  let imageFlavor = '';
  if (flags.ubi) imageFlavor += `-${ubiVersionTag}`;
  if (flags.ironbank) imageFlavor += '-ironbank';
  if (flags.cloud) imageFlavor += '-cloud';

  // General docker var config
  const license = 'Elastic License';
  const imageTag = `docker.elastic.co/kibana${flags.cloud ? '-ci' : ''}/kibana`;
  const version = config.getBuildVersion();
  const artifactArchitecture = flags.architecture === 'aarch64' ? 'aarch64' : 'x86_64';
  const artifactPrefix = `kibana-${version}-linux`;
  const artifactTarball = `${artifactPrefix}-${artifactArchitecture}.tar.gz`;
  const beatsArchitecture = flags.architecture === 'aarch64' ? 'arm64' : 'x86_64';
  const metricbeatTarball = `metricbeat-${version}-linux-${beatsArchitecture}.tar.gz`;
  const filebeatTarball = `filebeat-${version}-linux-${beatsArchitecture}.tar.gz`;
  const artifactsDir = config.resolveFromTarget('.');
  const beatsDir = config.resolveFromRepo('.beats');
  const dockerBuildDate = flags.dockerBuildDate || new Date().toISOString();
  // That would produce oss, default and default-ubi7
  const dockerBuildDir = config.resolveFromRepo('build', 'kibana-docker', `default${imageFlavor}`);
  const imageArchitecture = flags.architecture === 'aarch64' ? '-aarch64' : '';
  const dockerTargetFilename = config.resolveFromTarget(
    `kibana${imageFlavor}-${version}-docker-image${imageArchitecture}.tar.gz`
  );
  const dependencies = [
    resolve(artifactsDir, artifactTarball),
    ...(flags.cloud
      ? [resolve(beatsDir, metricbeatTarball), resolve(beatsDir, filebeatTarball)]
      : []),
  ];

  const dockerCrossCompile = config.getDockerCrossCompile();
  const publicArtifactSubdomain = config.isRelease ? 'artifacts' : 'snapshots-no-kpi';
  const scope: TemplateContext = {
    artifactPrefix,
    artifactTarball,
    imageFlavor,
    version,
    branch: kibanaPackageJson.branch,
    license,
    artifactsDir,
    imageTag,
    dockerBuildDir,
    dockerTargetFilename,
    dockerCrossCompile,
    baseOSImage,
    dockerBuildDate,
    ubi: flags.ubi,
    ubuntu: flags.ubuntu,
    cloud: flags.cloud,
    metricbeatTarball,
    filebeatTarball,
    ironbank: flags.ironbank,
    architecture: flags.architecture,
    revision: config.getBuildSha(),
    publicArtifactSubdomain,
  };

  type HostArchitectureToDocker = Record<string, string>;
  const hostTarget: HostArchitectureToDocker = {
    x64: 'x64',
    arm64: 'aarch64',
  };
  const buildArchitectureSupported = hostTarget[process.arch] === flags.architecture;
  if (flags.architecture && !buildArchitectureSupported && !dockerCrossCompile) {
    return;
  }

  // Create the docker build target folder
  await mkdirp(dockerBuildDir);

  // Write all the needed docker config files
  // into kibana-docker folder
  for (const [, dockerTemplate] of Object.entries(dockerTemplates)) {
    await write(resolve(dockerBuildDir, dockerTemplate.name), dockerTemplate.generator(scope));
  }

  // Copy all the needed resources into kibana-docker folder
  // in order to build the docker image accordingly the dockerfile defined
  // under templates/kibana_yml.template/js
  await copyAll(
    config.resolveFromRepo('src/dev/build/tasks/os_packages/docker_generator/resources/base'),
    dockerBuildDir
  );

  if (flags.ironbank) {
    await copyAll(
      config.resolveFromRepo('src/dev/build/tasks/os_packages/docker_generator/resources/ironbank'),
      dockerBuildDir
    );
  }

  // Build docker image into the target folder
  // In order to do this we just call the file we
  // created from the templates/build_docker_sh.template.js
  // and we just run that bash script
  await chmodAsync(`${resolve(dockerBuildDir, 'build_docker.sh')}`, '755');

  // Only build images on native targets
  if (flags.image) {
    // Link dependencies
    for (const src of dependencies) {
      const file = basename(src);
      const dest = resolve(dockerBuildDir, file);
      try {
        await accessAsync(src);
        await unlinkAsync(dest);
      } catch (e) {
        if (e && e.code === 'ENOENT' && e.syscall === 'access') {
          throw new Error(`${src} is needed in order to build the docker image.`);
        }
      }
      await linkAsync(src, dest);
    }

    await exec(log, `./build_docker.sh`, [], {
      cwd: dockerBuildDir,
      level: 'info',
    });
  }

  // Pack Dockerfiles and create a target for them
  if (flags.context) {
    await bundleDockerFiles(config, log, scope);
  }
}
