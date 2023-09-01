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
import { resolve, basename, join } from 'path';

import { ToolingLog } from '@kbn/tooling-log';
import { kibanaPackageJson as pkg, REPO_ROOT } from '@kbn/repo-info';
import { ES_P12_PASSWORD, ES_P12_PATH } from '@kbn/dev-utils';

import { createCliError } from '../errors';
import { EsClusterExecOptions } from '../cluster_exec_options';
import {
  ESS_RESOURCES_PATHS,
  ESS_SECRETS_PATH,
  ESS_JWKS_PATH,
  ESS_CONFIG_PATH,
  ESS_FILES_PATH,
} from '../paths';
import {
  ELASTIC_SERVERLESS_SUPERUSER,
  ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
} from './ess_file_realm';
import { SYSTEM_INDICES_SUPERUSER } from './native_realm';

interface BaseOptions {
  tag?: string;
  image?: string;
  port?: number;
  ssl?: boolean;
  kill?: boolean;
  files?: string | string[];
}

export interface DockerOptions extends EsClusterExecOptions, BaseOptions {
  dockerCmd?: string;
}

export interface ServerlessOptions extends EsClusterExecOptions, BaseOptions {
  clean?: boolean;
  basePath: string;
  teardown?: boolean;
  background?: boolean;
}

interface ServerlessEsNodeArgs {
  esArgs?: Array<[string, string]>;
  image: string;
  name: string;
  params: string[];
}

export const DEFAULT_PORT = 9200;
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

  ['xpack.security.http.ssl.verification_mode', 'certificate'],

  ['xpack.security.transport.ssl.enabled', 'true'],

  ['xpack.security.transport.ssl.keystore.path', `${ESS_CONFIG_PATH}certs/elasticsearch.p12`],

  ['xpack.security.transport.ssl.verification_mode', 'certificate'],

  ['xpack.security.operator_privileges.enabled', 'true'],
];

const SERVERLESS_SSL_ESARGS: Array<[string, string]> = [
  ['xpack.security.authc.realms.jwt.jwt1.client_authentication.type', 'shared_secret'],

  ['xpack.security.authc.realms.jwt.jwt1.order', '-98'],

  ['xpack.security.authc.realms.jwt.jwt1.allowed_issuer', 'https://kibana.elastic.co/jwt/'],

  ['xpack.security.authc.realms.jwt.jwt1.allowed_audiences', 'elasticsearch'],

  ['xpack.security.authc.realms.jwt.jwt1.pkc_jwkset_path', `${ESS_CONFIG_PATH}secrets/jwks.json`],

  ['xpack.security.authc.realms.jwt.jwt1.claims.principal', 'sub'],
];

const DOCKER_SSL_ESARGS: Array<[string, string]> = [
  ['xpack.security.http.ssl.keystore.password', ES_P12_PASSWORD],

  ['xpack.security.transport.ssl.keystore.password', ES_P12_PASSWORD],
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
    // inherit is required to show Docker pull output
    stdio: ['ignore', 'inherit', 'pipe'],
  }).catch(({ message, stderr }) => {
    throw createCliError(
      stderr.includes('unauthorized: authentication required')
        ? `Error authenticating with ${DOCKER_REGISTRY}. Visit https://docker-auth.elastic.co/github_auth to login.`
        : message
    );
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
      log.info(chalk.bold('Killing running ES Nodes.'));
      await execa('docker', ['kill'].concat(runningNodes));

      return;
    }

    throw createCliError(
      'ES has already been started, pass --kill to automatically stop the nodes on startup.'
    );
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

      // Guide the user to use SSL flag instead of manual setup
      if (key === 'xpack.security.enabled' && value?.[0] === 'true') {
        throw createCliError(
          'Use the --ssl flag to automatically enable and set up the security plugin.'
        );
      }

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
 * Removes REPO_ROOT from hostPath. Keep the rest to avoid filename collisions.
 * Returns the path where a file will be mounted inside the ES or ESS container.
 * /root/kibana/package/foo/bar.json => /usr/share/elasticsearch/files/package/foo/bar.json
 */
export function getDockerFileMountPath(hostPath: string) {
  return join(ESS_FILES_PATH, hostPath.replace(REPO_ROOT, ''));
}

/**
 * Setup local volumes for Serverless ES
 */
export async function setupServerlessVolumes(log: ToolingLog, options: ServerlessOptions) {
  const { basePath, clean, ssl, files } = options;
  const objectStorePath = resolve(basePath, 'stateless');

  log.info(chalk.bold(`Checking for local serverless ES object store at ${objectStorePath}`));
  log.indent(4);

  if (clean && fs.existsSync(objectStorePath)) {
    log.info('Cleaning existing object store.');
    await Fsp.rm(objectStorePath, { recursive: true, force: true });
  }

  if (clean || !fs.existsSync(objectStorePath)) {
    await Fsp.mkdir(objectStorePath, { recursive: true }).then(() =>
      log.info('Created new object store.')
    );
  } else {
    log.info('Using existing object store.');
  }

  // Permissions are set separately from mkdir due to default umask
  await Fsp.chmod(objectStorePath, 0o777).then(() => {
    log.info('Setup object store permissions (chmod 777).');
  });

  log.indent(-4);

  const volumeCmds = ['--volume', `${basePath}:/objectstore:z`];

  if (files) {
    const _files = typeof files === 'string' ? [files] : files;
    const fileCmds = _files.reduce<string[]>((acc, filePath) => {
      acc.push('--volume', `${filePath}:${getDockerFileMountPath(filePath)}:z`);

      return acc;
    }, []);

    volumeCmds.push(...fileCmds);
  }

  if (ssl) {
    const essResources = ESS_RESOURCES_PATHS.reduce<string[]>((acc, path) => {
      acc.push('--volume', `${path}:${ESS_CONFIG_PATH}${basename(path)}`);

      return acc;
    }, []);

    volumeCmds.push(
      ...getESp12Volume(),
      ...essResources,

      '--volume',
      `${ESS_SECRETS_PATH}:${ESS_CONFIG_PATH}secrets/secrets.json:z`,

      '--volume',
      `${ESS_JWKS_PATH}:${ESS_CONFIG_PATH}secrets/jwks.json:z`
    );
  }

  return volumeCmds;
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
          resolveEsArgs(
            DEFAULT_SERVERLESS_ESARGS.concat(
              node.esArgs ?? [],
              options.ssl ? SERVERLESS_SSL_ESARGS : []
            ),
            options
          ),
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

  if (options.ssl) {
    log.success(`SSL and Security have been enabled for ES.
      Login through your browser with username ${chalk.bold.cyan(
        ELASTIC_SERVERLESS_SUPERUSER
      )} or ${chalk.bold.cyan(SYSTEM_INDICES_SUPERUSER)} and password ${chalk.bold.magenta(
      ELASTIC_SERVERLESS_SUPERUSER_PASSWORD
    )}.
    `);

    log.warning(`Kibana should be started with the SSL flag so that it can authenticate with ES.
      See packages/kbn-es/src/ess_resources/README.md for additional information on authentication.    
    `);
  }

  if (!options.background) {
    // The ESS cluster has to be started detached, so we attach a logger afterwards for output
    await execa('docker', ['logs', '-f', SERVERLESS_NODES[0].name], {
      // inherit is required to show Docker output and Java console output for pw, enrollment token, etc
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  }

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
    resolveEsArgs(DEFAULT_DOCKER_ESARGS.concat(options.ssl ? DOCKER_SSL_ESARGS : []), options),
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
