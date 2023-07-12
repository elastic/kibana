/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import execa from 'execa';

import { ToolingLog } from '@kbn/tooling-log';
import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import { createCliError } from '../errors';
import { EsClusterExecOptions } from '../cluster_exec_options';

export interface DockerOptions extends EsClusterExecOptions {
  version?: string;
  image?: string;
  dockerCmd?: string;
}

export interface ServerlessOptions extends EsClusterExecOptions {
  tag?: string;
  image?: string;
}

const DEFAULT_DOCKER_BASE_CMD = 'run --name es01 -p 9200:9200 -p 9300:9300 -d --rm';
export const DEFAULT_DOCKER_REGISTRY = 'docker.elastic.co';
export const DEFAULT_DOCKER_IMG = `${DEFAULT_DOCKER_REGISTRY}/elasticsearch/elasticsearch:${pkg.version}-SNAPSHOT`;
export const DEFAULT_DOCKER_CMD = `${DEFAULT_DOCKER_BASE_CMD} ${DEFAULT_DOCKER_IMG}`;

/**
 * Verify that Docker is installed locally
 */
export async function verifyDockerInstalled(log: ToolingLog) {
  const { stdout } = await execa('docker', ['--version']).catch((error) => {
    throw createCliError(
      `Docker not found locally. Install it from: https://www.docker.com\n\n${error.message}`
    );
  });

  log.indent(4, () => {
    log.info(stdout);
  });
}

/**
 * Setup elastic Docker network if needed
 */
export async function maybeCreateDockerNetwork(log: ToolingLog) {
  log.indent(4);

  const p = await execa('docker', ['network', 'create', 'elastic']).catch(({ message }) => {
    if (message.includes('network with name elastic already exists')) {
      log.info('Using existing elastic Docker network.');
    } else {
      throw createCliError(message);
    }
  });

  if (p?.exitCode === 0) {
    log.info('Created elastic Docker network.');
  }
}

const resolveDockerImage = ({ version, image }: DockerOptions) => {
  if (image) {
    return image;
  } else if (version) {
    return `${DEFAULT_DOCKER_REGISTRY}:${version}-SNAPSHOT`;
  }

  return DEFAULT_DOCKER_IMG;
};

export const resolveDockerCmd = (options: DockerOptions) => {
  let cmd;

  if (options.dockerCmd) {
    cmd = options.dockerCmd;
  } else {
    const img = resolveDockerImage(options);

    cmd = `${DEFAULT_DOCKER_BASE_CMD} ${img}`;
  }

  return cmd.split(' ');
};
