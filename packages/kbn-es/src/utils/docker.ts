/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import chalk from 'chalk';
import execa from 'execa';
import fs from 'fs';
import Fsp from 'fs/promises';
import { resolve } from 'path';

import { ToolingLog } from '@kbn/tooling-log';
import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import { getDataPath } from '@kbn/utils';

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
  clean?: boolean;
}

interface RunServerlessEsNodeArgs {
  params: string[];
  name: string;
  image: string;
}

const DEFAULT_DOCKER_BASE_CMD = 'run --name es01 -p 9200:9200 -p 9300:9300 -d --rm';
export const DEFAULT_DOCKER_REGISTRY = 'docker.elastic.co';
export const DEFAULT_DOCKER_IMG = `${DEFAULT_DOCKER_REGISTRY}/elasticsearch/elasticsearch:${pkg.version}-SNAPSHOT`;
export const DEFAULT_DOCKER_CMD = `${DEFAULT_DOCKER_BASE_CMD} ${DEFAULT_DOCKER_IMG}`;
const SHARED_SERVERLESS_PARAMS = [
  'run',

  // '--rm',

  '--detach',

  '--net',
  'elastic',

  '--env',
  'ES_JAVA_OPTS="-Xms1g -Xmx1g"',

  '--env',
  'cluster.initial_master_nodes=es01,es02,es03',

  '--env',
  'xpack.security.enabled=false',

  '--env',
  'cluster.name=stateless',

  '--env',
  'stateless.enabled=true',

  '--env',
  'stateless.object_store.type=fs',

  '--env',
  'stateless.object_store.bucket=stateless',

  '--env',
  'path.repo=/objectstore',
];

/**
 * Verify that Docker is installed locally
 */
export async function verifyDockerInstalled(log: ToolingLog) {
  log.info(chalk.bold('Verifying Docker is installed.'));

  const { stdout } = await execa('docker', ['--version']).catch((error) => {
    throw createCliError(
      `Docker not found locally. Install it from: https://www.docker.com\n\n${error.message}`
    );
  });

  log.indent(4, () => log.info(stdout));
}

/**
 * Setup elastic Docker network if needed
 */
export async function maybeCreateDockerNetwork(log: ToolingLog) {
  log.info(chalk.bold('Checking status of elastic Docker network.'));
  log.indent(4);

  const p = await execa('docker', ['network', 'create', 'elastic']).catch(({ message }) => {
    if (message.includes('network with name elastic already exists')) {
      log.info('Using existing network.');
    } else {
      throw createCliError(message);
    }
  });

  if (p?.exitCode === 0) {
    log.info('Created new network.');
  }

  log.indent(-4);
}

/**
 * Setup local volumes for Serverless ES
 */
export async function setupServerlessVolumes(log: ToolingLog, options: ServerlessOptions) {
  const volumePath = resolve(getDataPath(), 'stateless');

  log.info(chalk.bold(`Checking for local Serverless ES object store at ${volumePath}`));
  log.indent(4);

  if (options.clean && fs.existsSync(volumePath)) {
    log.info('Cleaning existing object store.');
    await Fsp.rm(volumePath, { recursive: true, force: true });
  }

  if (options.clean || !fs.existsSync(volumePath)) {
    await Fsp.mkdir(volumePath, { recursive: true }).then(() =>
      log.info('Created new object store.')
    );
  } else {
    log.info('Using existing object store.');
  }

  // Permissions are set separately from mkdir due to default umask
  await Fsp.chmod(volumePath, 0o766).then(() =>
    log.info('Setup object store permissions (chmod 766).')
  );

  log.indent(-4);

  return getDataPath();
}

export async function runServerlessEsNode(
  log: ToolingLog,
  { params, name, image }: RunServerlessEsNodeArgs
) {
  const fullCmd = SHARED_SERVERLESS_PARAMS.concat(
    params,
    ['--name', name, '--env', `node.name=${name}`],
    image
  );

  log.info(chalk.bold(`Running Serverless ES node: ${name}`));
  log.indent(4);
  log.info(chalk.dim(`docker ${fullCmd.join(' ')}`));

  const { stdout } = await execa('docker', fullCmd);

  log.info(`Serverless ES node is running.
  Container Name: ${name}
  Container Id:   ${stdout}

  View running output:  ${chalk.bold(`docker attach ---sig-proxy=false ${name}`)}
  Shell access:         ${chalk.bold(`docker exec -it ${name} /bin/bash`)}
  Kill container:       ${chalk.bold(`docker kill ${stdout}`)}
`);

  log.indent(-4);
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
