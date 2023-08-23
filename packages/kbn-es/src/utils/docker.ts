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
  basePath: string;
}

interface ServerlessEsNodeArgs {
  esArgs?: Array<[string, string]>;
  image: string;
  name: string;
  params: string[];
}

const DOCKER_REGISTRY = 'docker.elastic.co';

const DOCKER_BASE_CMD = [
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
];

const DEFAULT_DOCKER_ESARGS: Array<[string, string]> = [
  ['ES_JAVA_OPTS', '-Xms1536m -Xmx1536m'],

  ['ES_LOG_STYLE', 'file'],

  ['discovery.type', 'single-node'],

  ['xpack.security.enabled', 'false'],
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
  'cluster.initial_master_nodes=es01,es02,es03',

  '--env',
  'stateless.enabled=true',

  '--env',
  'stateless.object_store.type=fs',

  '--env',
  'stateless.object_store.bucket=stateless',

  '--env',
  'path.repo=/objectstore',
];

// only allow certain ES args to be overwrote by options
const DEFAULT_SERVERLESS_ESARGS: Array<[string, string]> = [
  ['ES_JAVA_OPTS', '-Xms1g -Xmx1g'],

  ['xpack.security.enabled', 'false'],

  ['cluster.name', 'stateless'],
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
    ],
    esArgs: [['xpack.searchable.snapshot.shared_cache.size', '1gb']],
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
    ],
    esArgs: [['xpack.searchable.snapshot.shared_cache.size', '1gb']],
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
 * Determine the Docker image from CLI options and defaults
 */
export function resolveDockerImage({
  tag,
  image,
  repo,
  defaultImg,
}: (ServerlessOptions | DockerOptions) & { repo: string; defaultImg: string }) {
  if (image) {
    if (!image.includes(DOCKER_REGISTRY)) {
      throw createCliError(
        `Only verified images from ${DOCKER_REGISTRY} are currently allowed.\nIf you require this functionality in @kbn/es please contact the Kibana Operations Team.`
      );
    }

    return image;
  } else if (tag) {
    return `${repo}:${tag}`;
  }

  return defaultImg;
}

/**
 * Verify that Docker is installed locally
 */
export async function verifyDockerInstalled(log: ToolingLog) {
  log.info(chalk.bold('Verifying Docker is installed.'));

  const { stdout } = await execa('docker', ['--version']).catch(({ message }) => {
    throw createCliError(
      `Docker not found locally. Install it from: https://www.docker.com\n\n${message}`
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
 * Common setup for Docker and Serverless containers
 */
async function setupDocker(log: ToolingLog) {
  await verifyDockerInstalled(log);
  await maybeCreateDockerNetwork(log);
}

/**
 * Override default esArgs with options.esArgs
 */
export function resolveEsArgs(
  defaultEsArgs: Array<[string, string]>,
  options: ServerlessOptions | DockerOptions
) {
  const esArgs = new Map(defaultEsArgs);

  if (options.esArgs) {
    const args = typeof options.esArgs === 'string' ? [options.esArgs] : options.esArgs;

    args.forEach((arg) => {
      const [key, ...value] = arg.split('=');
      esArgs.set(key.trim(), value.join('=').trim());
    });
  }

  if (options.password) {
    esArgs.set('ELASTIC_PASSWORD', options.password);
  }

  return Array.from(esArgs).flatMap((e) => ['--env', e.join('=')]);
}

/**
 * Setup local volumes for Serverless ES
 */
export async function setupServerlessVolumes(log: ToolingLog, options: ServerlessOptions) {
  const volumePath = resolve(options.basePath, 'stateless');

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

  return ['--volume', `${options.basePath}:/objectstore:z`];
}

/**
 * Resolve the Serverless ES image based on defaults and CLI options
 */
function getServerlessImage(options: ServerlessOptions) {
  return resolveDockerImage({
    ...options,
    repo: SERVERLESS_REPO,
    defaultImg: SERVERLESS_IMG,
  });
}

/**
 * Run a single node in the ES Serverless cluster
 */
export async function runServerlessEsNode(
  log: ToolingLog,
  { params, name, image }: ServerlessEsNodeArgs
) {
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

  View logs:            ${chalk.bold(`docker logs -f ${name}`)}
  Shell access:         ${chalk.bold(`docker exec -it ${name} /bin/bash`)}
`)
  );
}

/**
 * Runs an ES Serverless Cluster through Docker
 */
export async function runServerlessCluster(log: ToolingLog, options: ServerlessOptions) {
  await setupDocker(log);

  const volumeCmd = await setupServerlessVolumes(log, options);
  const image = getServerlessImage(options);

  const nodeNames = await Promise.all(
    SERVERLESS_NODES.map(async (node) => {
      await runServerlessEsNode(log, {
        ...node,
        image,
        params: node.params.concat(
          resolveEsArgs(DEFAULT_SERVERLESS_ESARGS.concat(node.esArgs ?? []), options),
          volumeCmd
        ),
      });
      return node.name;
    })
  );

  log.success(`Serverless ES cluster running.
      Stop the cluster:     ${chalk.bold(`docker container stop ${nodeNames.join(' ')}`)}
    `);
}

/**
 * Resolve the Elasticsearch image based on defaults and CLI options
 */
function getDockerImage(options: DockerOptions) {
  return resolveDockerImage({ ...options, repo: DOCKER_REPO, defaultImg: DOCKER_IMG });
}

/**
 * Resolve the full command to run Elasticsearch Docker container
 */
export function resolveDockerCmd(options: DockerOptions) {
  if (options.dockerCmd) {
    return options.dockerCmd.split(' ');
  }

  return DOCKER_BASE_CMD.concat(
    resolveEsArgs(DEFAULT_DOCKER_ESARGS, options),
    getDockerImage(options)
  );
}

/**
 *
 * Runs an Elasticsearch Docker Container
 */
export async function runDockerContainer(log: ToolingLog, options: DockerOptions) {
  await setupDocker(log);

  const dockerCmd = resolveDockerCmd(options);

  log.info(chalk.dim(`docker ${dockerCmd.join(' ')}`));
  return await execa('docker', dockerCmd, {
    // inherit is required to show Docker pull output and Java console output for pw, enrollment token, etc
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}
