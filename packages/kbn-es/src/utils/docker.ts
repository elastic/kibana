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

interface BaseOptions {
  tag?: string;
  image?: string;
}

export interface DockerOptions extends EsClusterExecOptions, BaseOptions {
  dockerCmd?: string;
}

export interface ServerlessOptions extends EsClusterExecOptions, BaseOptions {
  clean?: boolean;
}

interface ServerlessEsNodeArgs {
  params: string[];
  name: string;
  image: string;
}

const DOCKER_REGISTRY = 'docker.elastic.co';

export const DOCKER_BASE_CMD = [
  'run',

  '--rm',

  '-t',

  '--net',
  'elastic',

  '--name',
  'es01',

  '-p',
  '127.0.0.1:9200:9200',

  '-p',
  '127.0.0.1:9300:9300',

  '--env',
  'ES_LOG_STYLE=file',

  '--env',
  'ES_JAVA_OPTS=-Xms1g -Xmx1g',
];

export const DOCKER_REPO = `${DOCKER_REGISTRY}/elasticsearch/elasticsearch`;
export const DOCKER_TAG = `${pkg.version}-SNAPSHOT`;
export const DOCKER_IMG = `${DOCKER_REPO}:${DOCKER_TAG}`;

export const SERVERLESS_REPO = `${DOCKER_REGISTRY}/elasticsearch-ci/elasticsearch-serverless`;
export const SERVERLESS_TAG = 'latest';
export const SERVERLESS_IMG = `${SERVERLESS_REPO}:${SERVERLESS_TAG}`;

const SHARED_SERVERLESS_PARAMS = [
  'run',

  '--rm',

  '--detach',

  '--net',
  'elastic',

  '--env',
  'ES_JAVA_OPTS=-Xms1g -Xmx1g',

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

const SERVERLESS_NODES: Array<Omit<ServerlessEsNodeArgs, 'image'>> = [
  {
    name: 'es01',
    params: [
      '-p',
      '127.0.0.1:9200:9200',

      '-p',
      '127.0.0.1:9300:9300',

      '--env',
      'discovery.seed_hosts=es02,es03',

      '--env',
      'node.roles=["master","index"]',

      '--env',
      'xpack.searchable.snapshot.shared_cache.size=1gb',
    ],
  },
  {
    name: 'es02',
    params: [
      '-p',
      '127.0.0.1:9202:9202',

      '-p',
      '127.0.0.1:9302:9302',

      '--env',
      'discovery.seed_hosts=es01,es03',

      '--env',
      'node.roles=["master","search"]',

      '--env',
      'xpack.searchable.snapshot.shared_cache.size=1gb',
    ],
  },
  {
    name: 'es03',
    params: [
      '-p',
      '127.0.0.1:9203:9203',

      '-p',
      '127.0.0.1:9303:9303',

      '--env',
      'discovery.seed_hosts=es01,es02',

      '--env',
      'node.roles=["master"]',
    ],
  },
];

/**
 *
 * Determine the Docker image from CLI options and defaults
 */
const resolveDockerImage = ({
  tag,
  image,
  repo,
  defaultImg,
}: (ServerlessOptions | DockerOptions) & { repo: string; defaultImg: string }) => {
  if (image) {
    return image;
  } else if (tag) {
    return `${repo}:${tag}`;
  }

  return defaultImg;
};

/**
 * Verify that Docker is installed locally
 */
async function verifyDockerInstalled(log: ToolingLog) {
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
async function maybeCreateDockerNetwork(log: ToolingLog) {
  log.info(chalk.bold('Checking status of elastic Docker network.'));
  log.indent(4);

  const process = await execa('docker', ['network', 'create', 'elastic']).catch(({ message }) => {
    if (message.includes('network with name elastic already exists')) {
      log.info('Using existing network.');
    } else {
      throw createCliError(message);
    }
  });

  if (process?.exitCode === 0) {
    log.info('Created new network.');
  }

  log.indent(-4);
}

/**
 *
 * Common setup for Docker and Serverless containers
 */
async function setupDocker(log: ToolingLog) {
  await verifyDockerInstalled(log);
  await maybeCreateDockerNetwork(log);
}

/**
 * Setup local volumes for Serverless ES
 */
async function setupServerlessVolumes(log: ToolingLog, options: ServerlessOptions) {
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

function getServerlessImage(options: ServerlessOptions) {
  return resolveDockerImage({
    ...options,
    repo: SERVERLESS_REPO,
    defaultImg: SERVERLESS_IMG,
  });
}

async function runServerlessEsNode(log: ToolingLog, { params, name, image }: ServerlessEsNodeArgs) {
  const dockerCmd = SHARED_SERVERLESS_PARAMS.concat(
    params,
    ['--name', name, '--env', `node.name=${name}`],
    image
  );

  log.info(chalk.bold(`Running Serverless ES node: ${name}`));
  log.indent(4, () => log.info(chalk.dim(`docker ${dockerCmd.join(' ')}`)));

  const { stdout } = await execa('docker', dockerCmd);

  log.indent(4, () =>
    log.info(`${name} is running.
  Container Name: ${name}
  Container Id:   ${stdout}

  View running output:  ${chalk.bold(`docker attach --sig-proxy=false ${name}`)}
  Shell access:         ${chalk.bold(`docker exec -it ${name} /bin/bash`)}
`)
  );
}

export async function runServerlessCluster(log: ToolingLog, options: ServerlessOptions) {
  await setupDocker(log);

  const volumeParentPath = await setupServerlessVolumes(log, options);
  const volumeCmd = ['--volume', `${volumeParentPath}:/objectstore:z`];
  const image = getServerlessImage(options);

  const nodeNames = await Promise.all(
    SERVERLESS_NODES.map(async (node) => {
      await runServerlessEsNode(log, { ...node, image, params: node.params.concat(volumeCmd) });
      return node.name;
    })
  );

  log.success(`Serverless ES cluster running.
      Stop the cluster:     ${chalk.bold(`docker container stop ${nodeNames.join(' ')}`)}
    `);
}

function getDockerImage(options: DockerOptions) {
  return resolveDockerImage({ ...options, repo: DOCKER_REPO, defaultImg: DOCKER_IMG });
}

/**
 * Resolve the command to run Elasticsearch Docker container
 */
const resolveDockerCmd = (options: DockerOptions) => {
  return options.dockerCmd
    ? options.dockerCmd.split(' ')
    : DOCKER_BASE_CMD.concat(getDockerImage(options));
};

export async function runDockerContainer(log: ToolingLog, options: DockerOptions) {
  await setupDocker(log);

  // TODO: add args
  const dockerCmd = resolveDockerCmd(options);

  log.info(chalk.dim(`docker ${dockerCmd.join(' ')}`));
  const { stdout } = await execa('docker', dockerCmd, {
    // inherit is required to show Java console output for pw, enrollment token, etc
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}
