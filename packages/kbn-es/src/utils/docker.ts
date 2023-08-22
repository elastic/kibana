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
import { ES_P12_PASSWORD, ES_P12_PATH } from '@kbn/dev-utils';

import { createCliError } from '../errors';
import { EsClusterExecOptions } from '../cluster_exec_options';
import { ESS_RESOURCES_PATHS } from '../paths';

interface BaseOptions {
  tag?: string;
  image?: string;
  port?: number;
  ssl?: boolean;
  kill?: boolean;
}

export interface DockerOptions extends EsClusterExecOptions, BaseOptions {
  dockerCmd?: string;
}

export interface ServerlessOptions extends EsClusterExecOptions, BaseOptions {
  clean?: boolean;
  basePath: string;
  teardown?: boolean;
}

interface ServerlessEsNodeArgs {
  esArgs?: Array<[string, string]>;
  image: string;
  name: string;
  params: string[];
}

export const DEFAULT_PORT = 9200;
const DOCKER_REGISTRY = 'docker.elastic.co';
const ESS_CONFIG_PATH = '/usr/share/elasticsearch/config/';

const DOCKER_BASE_CMD = [
  'run',

  '--rm',

  '-t',

  '--net',
  'elastic',

  '--name',
  'es01',

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

// See for default cluster settings
// https://github.com/elastic/elasticsearch-serverless/blob/main/serverless-build-tools/src/main/kotlin/elasticsearch.serverless-run.gradle.kts
const SHARED_SERVERLESS_PARAMS = [
  'run',

  '--rm',

  '--detach',

  '--interactive',

  '--tty',

  '--net',
  'elastic',

  '--env',
  'path.repo=/objectstore',

  '--env',
  'cluster.initial_master_nodes=es01,es02,es03',

  '--env',
  'stateless.enabled=true',

  '--env',
  'stateless.object_store.type=fs',

  '--env',
  'stateless.object_store.bucket=stateless',
];

// only allow certain ES args to be overwrote by options
const DEFAULT_SERVERLESS_ESARGS: Array<[string, string]> = [
  ['ES_JAVA_OPTS', '-Xms1g -Xmx1g'],

  ['ES_LOG_STYLE', 'file'],

  ['cluster.name', 'stateless'],

  ['ingest.geoip.downloader.enabled', 'false'],

  ['xpack.ml.enabled', 'true'],

  ['xpack.security.enabled', 'false'],
];

const DEFAULT_SSL_ESARGS: Array<[string, string]> = [
  ['xpack.security.enabled', 'true'],

  ['xpack.security.http.ssl.enabled', 'true'],

  ['xpack.security.http.ssl.keystore.path', `${ESS_CONFIG_PATH}certs/elasticsearch.p12`],

  ['xpack.security.http.ssl.keystore.password', ES_P12_PASSWORD],

  ['xpack.security.http.ssl.verification_mode', 'certificate'],

  ['xpack.security.transport.ssl.enabled', 'true'],

  ['xpack.security.transport.ssl.keystore.path', `${ESS_CONFIG_PATH}certs/elasticsearch.p12`],

  ['xpack.security.transport.ssl.keystore.password', ES_P12_PASSWORD],

  ['xpack.security.transport.ssl.verification_mode', 'certificate'],

  ['xpack.security.operator_privileges.enabled', 'true'],
];

const SERVERLESS_NODES: Array<Omit<ServerlessEsNodeArgs, 'image'>> = [
  {
    name: 'es01',
    params: [
      '-p',
      '127.0.0.1:9300:9300',

      '--env',
      'discovery.seed_hosts=es02,es03',

      '--env',
      'node.roles=["master","remote_cluster_client","ingest","index"]',
    ],
    esArgs: [
      ['xpack.searchable.snapshot.shared_cache.size', '16MB'],

      ['xpack.searchable.snapshot.shared_cache.region_size', '256K'],
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
      'node.roles=["master","remote_cluster_client","search"]',
    ],
    esArgs: [
      ['xpack.searchable.snapshot.shared_cache.size', '16MB'],

      ['xpack.searchable.snapshot.shared_cache.region_size', '256K'],
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
      'node.roles=["master","remote_cluster_client","ml","transform"]',
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
 * Determine the port to bind the Serverless index node or Docker node to
 */
export function resolvePort(options: ServerlessOptions | DockerOptions) {
  if (options.port) {
    return [
      '-p',
      `127.0.0.1:${options.port}:${options.port}`,
      '--env',
      `http.port=${options.port}`,
    ];
  }

  return ['-p', `127.0.0.1:${DEFAULT_PORT}:${DEFAULT_PORT}`];
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
 *
 * Pull a Docker image if needed. Ensures latest image.
 * Stops serverless from pulling the same image in each node's promise and
 * gives better control of log output, instead of falling back to docker run.
 */
export async function maybePullDockerImage(log: ToolingLog, image: string) {
  log.info(chalk.bold(`Checking for image: ${image}`));

  await execa('docker', ['pull', image], {
    // inherit is required to show Docker output
    stdio: ['ignore', 'inherit', 'inherit'],
  }).catch(({ message }) => {
    throw createCliError(message);
  });
}

export async function detectRunningNodes(
  log: ToolingLog,
  options: ServerlessOptions | DockerOptions
) {
  const namesCmd = SERVERLESS_NODES.reduce<string[]>((acc, { name }) => {
    acc.push('--filter', `name=${name}`);

    return acc;
  }, []);

  const { stdout } = await execa('docker', ['ps', '--quiet'].concat(namesCmd));
  const runningNodes = stdout.split(/\r?\n/).filter((s) => s);

  if (runningNodes.length) {
    if (options.kill) {
      log.info(chalk.bold('Running ES Nodes detected, killing.'));
      await execa('docker', ['kill'].concat(runningNodes));

      return;
    }

    throw createCliError('ES has already been started');
  }
}

/**
 * Common setup for Docker and Serverless containers
 */
async function setupDocker({
  log,
  image,
  options,
}: {
  log: ToolingLog;
  image: string;
  options: ServerlessOptions | DockerOptions;
}) {
  await verifyDockerInstalled(log);
  await detectRunningNodes(log, options);
  await maybeCreateDockerNetwork(log);
  await maybePullDockerImage(log, image);
}

/**
 * Override default esArgs with options.esArgs
 */
export function resolveEsArgs(
  defaultEsArgs: Array<[string, string]>,
  options: ServerlessOptions | DockerOptions
) {
  const { esArgs: customEsArgs, password, ssl } = options;
  const esArgs = new Map(defaultEsArgs);

  if (ssl) {
    DEFAULT_SSL_ESARGS.forEach((arg) => {
      esArgs.set(arg[0], arg[1]);
    });
  }

  if (customEsArgs) {
    const args = typeof customEsArgs === 'string' ? [customEsArgs] : customEsArgs;

    args.forEach((arg) => {
      const [key, ...value] = arg.split('=');
      esArgs.set(key.trim(), value.join('=').trim());
    });
  }

  if (password) {
    esArgs.set('ELASTIC_PASSWORD', password);
  }

  return Array.from(esArgs).flatMap((e) => ['--env', e.join('=')]);
}

function getESp12Volume() {
  return ['--volume', `${ES_P12_PATH}:${ESS_CONFIG_PATH}certs/elasticsearch.p12`];
}

/**
 * Setup local volumes for Serverless ES
 */
export async function setupServerlessVolumes(log: ToolingLog, options: ServerlessOptions) {
  const { basePath, clean, ssl } = options;
  const volumePath = resolve(basePath, 'stateless');

  log.info(chalk.bold(`Checking for local serverless ES object store at ${volumePath}`));
  log.indent(4);

  if (clean && fs.existsSync(volumePath)) {
    log.info('Cleaning existing object store.');
    await Fsp.rm(volumePath, { recursive: true, force: true });
  }

  if (clean || !fs.existsSync(volumePath)) {
    await Fsp.mkdir(volumePath, { recursive: true }).then(() =>
      log.info('Created new object store.')
    );
  } else {
    log.info('Using existing object store.');
  }

  // Permissions are set separately from mkdir due to default umask
  await Fsp.chmod(volumePath, 0o777).then(() => {
    log.info('Setup object store permissions (chmod 777).');
  });

  log.indent(-4);

  const baseCmd = ['--volume', `${basePath}:/objectstore:z`];

  if (ssl) {
    const essResources = ESS_RESOURCES_PATHS.reduce<string[]>((acc, path) => {
      const fileName = path.split('/').at(-1);

      acc.push('--volume', `${path}:${ESS_CONFIG_PATH}${fileName}`);

      return acc;
    }, []);

    return baseCmd.concat(getESp12Volume(), essResources);
  }

  return baseCmd;
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

  log.info(chalk.bold(`Running serverless ES node: ${name}`));
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
  const image = getServerlessImage(options);
  await setupDocker({ log, image, options });

  const volumeCmd = await setupServerlessVolumes(log, options);

  const nodeNames = await Promise.all(
    SERVERLESS_NODES.map(async (node, i) => {
      await runServerlessEsNode(log, {
        ...node,
        image,
        params: node.params.concat(
          resolveEsArgs(DEFAULT_SERVERLESS_ESARGS.concat(node.esArgs ?? []), options),
          i === 0 ? resolvePort(options) : [],
          volumeCmd
        ),
      });
      return node.name;
    })
  );

  log.success(`Serverless ES cluster running.
      Stop the cluster:     ${chalk.bold(`docker container stop ${nodeNames.join(' ')}`)}
    `);

  return nodeNames;
}

/**
 * Stop a serverless ES cluster by node names
 */
export async function stopServerlessCluster(log: ToolingLog, nodes: string[]) {
  log.info('Stopping serverless ES cluster.');

  await execa('docker', ['container', 'stop'].concat(nodes));
}

/**
 * Kill any serverless ES nodes which are running.
 */
export function teardownServerlessClusterSync(log: ToolingLog, options: ServerlessOptions) {
  const { stdout } = execa.commandSync(
    `docker ps --filter status=running --filter ancestor=${getServerlessImage(options)} --quiet`
  );
  // Filter empty strings
  const runningNodes = stdout.split(/\r?\n/).filter((s) => s);

  if (runningNodes.length) {
    log.info('Killing running serverless ES nodes.');

    execa.commandSync(`docker kill ${runningNodes.join(' ')}`);
  }
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
export function resolveDockerCmd(options: DockerOptions, image: string = DOCKER_IMG) {
  if (options.dockerCmd) {
    return options.dockerCmd.split(' ');
  }

  return DOCKER_BASE_CMD.concat(
    resolveEsArgs(DEFAULT_DOCKER_ESARGS, options),
    resolvePort(options),
    options.ssl ? getESp12Volume() : [],
    image
  );
}

/**
 * Runs an Elasticsearch Docker Container
 */
export async function runDockerContainer(log: ToolingLog, options: DockerOptions) {
  let image;

  if (!options.dockerCmd) {
    image = getDockerImage(options);
    await setupDocker({ log, image, options });
  }

  const dockerCmd = resolveDockerCmd(options, image);

  log.info(chalk.dim(`docker ${dockerCmd.join(' ')}`));
  return await execa('docker', dockerCmd, {
    // inherit is required to show Docker output and Java console output for pw, enrollment token, etc
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}
