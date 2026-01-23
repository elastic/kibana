/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import execa from 'execa';
import fs, { existsSync } from 'fs';
import Fsp from 'fs/promises';
import pRetry from 'p-retry';
import { resolve, basename, join } from 'path';
import type { ClientOptions } from '@elastic/elasticsearch';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { kibanaPackageJson as pkg, REPO_ROOT } from '@kbn/repo-info';
import { CA_CERT_PATH, ES_P12_PASSWORD, ES_P12_PATH } from '@kbn/dev-utils';
import {
  MOCK_IDP_REALM_NAME,
  MOCK_IDP_ENTITY_ID,
  MOCK_IDP_ATTRIBUTE_PRINCIPAL,
  MOCK_IDP_ATTRIBUTE_ROLES,
  MOCK_IDP_ATTRIBUTE_EMAIL,
  MOCK_IDP_ATTRIBUTE_NAME,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN_EXPIRES_AT,
  MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN,
  MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN_EXPIRES_AT,
  MOCK_IDP_UIAM_ORGANIZATION_ID,
  MOCK_IDP_UIAM_PROJECT_ID,
  ensureSAMLRoleMapping,
  createMockIdpMetadata,
  MOCK_IDP_UIAM_SERVICE_INTERNAL_URL,
} from '@kbn/mock-idp-utils';

import { initializeUiamContainers, runUiamContainer, UIAM_CONTAINERS } from './docker_uiam';
import { getServerlessImageTag, getCommitUrl } from './extract_image_info';
import { waitForSecurityIndex } from './wait_for_security_index';
import { createCliError } from '../errors';
import type { EsClusterExecOptions } from '../cluster_exec_options';
import {
  SERVERLESS_RESOURCES_PATHS,
  SERVERLESS_SECRETS_PATH,
  SERVERLESS_JWKS_PATH,
  SERVERLESS_IDP_METADATA_PATH,
  SERVERLESS_CONFIG_PATH,
  SERVERLESS_FILES_PATH,
  SERVERLESS_SECRETS_SSL_PATH,
  SERVERLESS_ROLES_ROOT_PATH,
  SERVERLESS_OPERATOR_PATH,
} from '../paths';
import {
  ELASTIC_SERVERLESS_SUPERUSER,
  ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
} from './serverless_file_realm';
import { SYSTEM_INDICES_SUPERUSER } from './native_realm';
import { waitUntilClusterReady } from './wait_until_cluster_ready';

interface ImageOptions {
  image?: string;
  tag?: string;
}

interface BaseOptions extends ImageOptions {
  port?: number;
  ssl?: boolean;
  /** Kill running cluster before starting a new cluster  */
  kill?: boolean;
  files?: string | string[];
}

export const serverlessProjectTypes = ['es', 'oblt', 'security', 'workplaceai'] as const;
export type ServerlessProjectType = (typeof serverlessProjectTypes)[number];

export const esServerlessProjectTypes = [
  'elasticsearch_general_purpose',
  'elasticsearch_search',
  'elasticsearch_vector',
  'elasticsearch_timeseries',
  'observability',
  'security',
  'workplaceai',
] as const;
export type EsServerlessProjectType = (typeof esServerlessProjectTypes)[number];

export const serverlessProductTiers = [
  'essentials',
  'logs_essentials',
  'complete',
  'search_ai_lake',
] as const;
export type ServerlessProductTier = (typeof serverlessProductTiers)[number];

export const isServerlessProjectType = (value: string): value is ServerlessProjectType => {
  return serverlessProjectTypes.includes(value as ServerlessProjectType);
};

export const isEsServerlessProjectType = (value: string): value is EsServerlessProjectType => {
  return esServerlessProjectTypes.includes(value as EsServerlessProjectType);
};

export const isServerlessProjectTier = (value: string): value is ServerlessProductTier => {
  return serverlessProductTiers.includes(value as ServerlessProductTier);
};

export const esProjectTypeFromKbn = new Map<string, string>([
  // resolve Kibana `es` project type to general purpose by default
  // other elasticsearch_* project types need to be set explicitly in the test config
  ['es', 'elasticsearch_general_purpose'],
  ['oblt', 'observability'],
  ['security', 'security'],
  ['workplaceai', 'workplaceai'],
]);

export const kbnProjectTypeFromEs = new Map<string, string>([
  ['elasticsearch_general_purpose', 'es'],
  ['elasticsearch_search', 'es'],
  ['elasticsearch_vector', 'es'],
  ['elasticsearch_timeseries', 'es'],
  ['observability', 'oblt'],
  ['security', 'security'],
  ['workplaceai', 'workplaceai'],
]);

export interface DockerOptions extends EsClusterExecOptions, BaseOptions {
  dockerCmd?: string;
}

export interface ServerlessOptions extends EsClusterExecOptions, BaseOptions {
  /** Publish ES docker container on additional host IP */
  host?: string;
  /** Serverless project type */
  projectType: ServerlessProjectType;
  /** Elasticsearch serverless project type */
  esProjectType?: EsServerlessProjectType;
  /** Product tier for serverless project */
  productTier?: ServerlessProductTier;
  /** Clean (or delete) all data created by the ES cluster after it is stopped */
  clean?: boolean;
  /** Full path where the ES cluster will store data */
  basePath: string;
  /** Directory in basePath where the ES cluster will store data */
  dataPath?: string;
  /** If this process exits, leave the ES cluster running in the background */
  skipTeardown?: boolean;
  /** Start the ES cluster in the background instead of remaining attached: useful for running tests */
  background?: boolean;
  /** Wait for the ES cluster to be ready to serve requests */
  waitForReady?: boolean;
  /** Fully qualified URL where Kibana is hosted (including base path) */
  kibanaUrl?: string;
  /**
   * Resource file(s) to overwrite
   * (see list of files that can be overwritten under `src/platform/packages/shared/kbn-es/src/serverless_resources/users`)
   */
  resources?: string | string[];
  /** Configure ES serverless with UIAM support */
  uiam?: boolean;
}

interface ServerlessEsNodeArgs {
  esArgs?: Array<[string, string]>;
  image: string;
  name: string;
  params: string[];
}

export const DEFAULT_PORT = 9200;
const DOCKER_REGISTRY = 'docker.elastic.co';

const ES_REFRESH_INTERVAL_OVERRIDE_FLAG =
  '-Des.stateless.allow.index.refresh_interval.override=true';

const DOCKER_BASE_CMD = [
  'run',

  '-t',

  '--net',
  'elastic',

  '--name',
  'es01',

  '-p',
  '127.0.0.1:9300:9300',
];

const DEFAULT_DOCKER_ESARGS: Array<[string, string]> = [
  ['ES_LOG_STYLE', 'file'],

  ['discovery.type', 'single-node'],

  ['xpack.security.enabled', 'false'],
];
// Temporary workaround for https://github.com/elastic/elasticsearch/issues/118583
if (process.arch === 'arm64') {
  DEFAULT_DOCKER_ESARGS.push(
    ['ES_JAVA_OPTS', '-Xms1536m -Xmx1536m -XX:UseSVE=0'],
    ['CLI_JAVA_OPTS', '-XX:UseSVE=0']
  );
} else {
  DEFAULT_DOCKER_ESARGS.push(['ES_JAVA_OPTS', '-Xms1536m -Xmx1536m']);
}

export const DOCKER_REPO = `${DOCKER_REGISTRY}/elasticsearch/elasticsearch`;
export const DOCKER_TAG = `${pkg.version}-SNAPSHOT`;
export const DOCKER_IMG = `${DOCKER_REPO}:${DOCKER_TAG}`;

export const ES_SERVERLESS_REPO_KIBANA = `${DOCKER_REGISTRY}/kibana-ci/elasticsearch-serverless`;
export const ES_SERVERLESS_REPO_ELASTICSEARCH = `${DOCKER_REGISTRY}/elasticsearch-ci/elasticsearch-serverless`;
export const ES_SERVERLESS_LATEST_VERIFIED_TAG = 'latest-verified';
export const ES_SERVERLESS_DEFAULT_IMAGE = `${ES_SERVERLESS_REPO_KIBANA}:${ES_SERVERLESS_LATEST_VERIFIED_TAG}`;

// See for default cluster settings
// https://github.com/elastic/elasticsearch-serverless/blob/main/serverless-build-tools/src/main/kotlin/elasticsearch.serverless-run.gradle.kts
const SHARED_SERVERLESS_PARAMS = [
  'run',

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
];

// only allow certain ES args to be overwrote by options
const DEFAULT_SERVERLESS_ESARGS: Array<[string, string]> = [
  ['ES_LOG_STYLE', 'file'],

  ['cluster.name', 'stateless'],

  ['ingest.geoip.downloader.enabled', 'false'],

  ['xpack.ml.enabled', 'true'],

  ['xpack.security.enabled', 'true'],

  // JWT realm settings are to closer emulate a real ES serverless env
  ['xpack.security.authc.realms.jwt.jwt1.allowed_audiences', 'elasticsearch'],

  ['xpack.security.authc.realms.jwt.jwt1.allowed_issuer', 'https://kibana.elastic.co/jwt/'],

  ['xpack.security.authc.realms.jwt.jwt1.claims.principal', 'sub'],

  ['xpack.security.authc.realms.jwt.jwt1.client_authentication.type', 'shared_secret'],

  ['xpack.security.authc.realms.jwt.jwt1.order', '-98'],

  [
    'xpack.security.authc.realms.jwt.jwt1.pkc_jwkset_path',
    `${SERVERLESS_CONFIG_PATH}jwks/jwks.json`,
  ],

  ['xpack.security.operator_privileges.enabled', 'true'],

  ['xpack.security.transport.ssl.enabled', 'true'],

  [
    'xpack.security.transport.ssl.keystore.path',
    `${SERVERLESS_CONFIG_PATH}certs/elasticsearch.p12`,
  ],

  ['xpack.security.transport.ssl.verification_mode', 'certificate'],

  [
    'xpack.security.remote_cluster_client.ssl.keystore.path',
    `${SERVERLESS_CONFIG_PATH}certs/elasticsearch.p12`,
  ],
  ['xpack.security.remote_cluster_client.ssl.verification_mode', 'certificate'],

  [
    'xpack.security.remote_cluster_server.ssl.keystore.path',
    `${SERVERLESS_CONFIG_PATH}certs/elasticsearch.p12`,
  ],
  ['xpack.security.remote_cluster_server.ssl.verification_mode', 'certificate'],
  ['xpack.security.remote_cluster_server.ssl.client_authentication', 'required'],
];
// Temporary workaround for https://github.com/elastic/elasticsearch/issues/118583
if (process.arch === 'arm64') {
  DEFAULT_SERVERLESS_ESARGS.push(
    ['ES_JAVA_OPTS', '-Xms1g -Xmx1g -XX:UseSVE=0'],
    ['CLI_JAVA_OPTS', '-XX:UseSVE=0']
  );
} else {
  DEFAULT_SERVERLESS_ESARGS.push(['ES_JAVA_OPTS', '-Xms1g -Xmx1g']);
}

const DEFAULT_SSL_ESARGS: Array<[string, string]> = [
  ['xpack.security.http.ssl.enabled', 'true'],

  ['xpack.security.http.ssl.keystore.path', `${SERVERLESS_CONFIG_PATH}certs/elasticsearch.p12`],

  ['xpack.security.http.ssl.verification_mode', 'certificate'],
];

const DOCKER_SSL_ESARGS: Array<[string, string]> = [
  ['xpack.security.enabled', 'true'],

  ['xpack.security.http.ssl.keystore.password', ES_P12_PASSWORD],

  ['xpack.security.transport.ssl.enabled', 'true'],

  [
    'xpack.security.transport.ssl.keystore.path',
    `${SERVERLESS_CONFIG_PATH}certs/elasticsearch.p12`,
  ],

  ['xpack.security.transport.ssl.verification_mode', 'certificate'],

  ['xpack.security.transport.ssl.keystore.password', ES_P12_PASSWORD],
];

export const SERVERLESS_NODES: Array<Omit<ServerlessEsNodeArgs, 'image'>> = [
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
      ['ES_JAVA_OPTS', '-Xms1536m -Xmx1536m'],
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
}: {
  tag?: string;
  image?: string;
  repo: string;
  defaultImg: string;
}) {
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
 * Determine the port and optionally an additional host to bind the Serverless index node or Docker node to
 */
export function resolvePort(options: ServerlessOptions | DockerOptions) {
  const port = options.port || DEFAULT_PORT;
  const value = ['-p', `127.0.0.1:${port}:${port}`];

  if ((options as ServerlessOptions).host) {
    value.push('-p', `${(options as ServerlessOptions).host}:${port}:${port}`);
  }

  if (options.port) {
    value.push('--env', `http.port=${options.port}`);
  }

  return value;
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

const RETRYABLE_DOCKER_PULL_ERROR_MESSAGES = [
  'connection refused',
  'i/o timeout',
  'Client.Timeout',
  'TLS handshake timeout',
];

/**
 * Pull a Docker image if needed. Ensures latest image.
 * Stops serverless from pulling the same image in each node's promise and
 * gives better control of log output, instead of falling back to docker run.
 */
export async function maybePullDockerImage(log: ToolingLog, image: string) {
  log.info(chalk.bold(`Checking for image: ${image}`));

  await pRetry(
    async () => {
      await execa('docker', ['pull', image], {
        // inherit is required to show Docker pull output
        stdio: ['ignore', 'inherit', 'pipe'],
      }).catch(({ message }) => {
        const errorMessage = `Error pulling image. This is likely an issue authenticating with ${DOCKER_REGISTRY}.
Visit ${chalk.bold.cyan('https://docker-auth.elastic.co/github_auth')} to login.

${message}`;
        throw createCliError(errorMessage);
      });
    },
    {
      retries: 2,
      onFailedAttempt: (error) => {
        // Only retry if retryable error messages are found in the error message.
        for (const msg of RETRYABLE_DOCKER_PULL_ERROR_MESSAGES) {
          if (error?.message?.includes(msg)) {
            log.info(`Retrying due to error: ${error.message}`);
            return;
          }
        }

        log.warning('Docker pull failed, error not retriable. Exiting.');
        throw error;
      },
    }
  );
}

/**
 * When we're working with :latest or :latest-verified, it is useful to expand what version they refer to
 */
export async function printDockerImageInfo(log: ToolingLog, image: string) {
  let imageFullName = image;
  if (image.includes('serverless')) {
    const imageTag = (await getServerlessImageTag(image)) ?? image.split(':').pop() ?? '';
    const imageBase = image.replace(/:.*/, '');
    imageFullName = `${imageBase}:${imageTag}`;
  }

  const revisionUrl = await getCommitUrl(image);
  log.info(`Using Docker image: ${imageFullName} (${revisionUrl})`);
}

export async function cleanUpDanglingContainers(log: ToolingLog) {
  log.info(chalk.bold('Cleaning up dangling Docker containers.'));

  try {
    const serverlessContainerNames = SERVERLESS_NODES.concat(UIAM_CONTAINERS).map(
      ({ name }) => name
    );

    for (const name of serverlessContainerNames) {
      await execa('docker', ['container', 'rm', name, '--force']).catch(() => {
        // Ignore errors if the container doesn't exist
      });
    }

    log.success('Cleaned up dangling Docker containers.');
  } catch (e) {
    log.error(e);
  }
}

export async function detectRunningNodes(log: ToolingLog, options: BaseOptions) {
  const namesCmd = SERVERLESS_NODES.concat(UIAM_CONTAINERS).reduce<string[]>((acc, { name }) => {
    acc.push('--filter', `name=${name}`);

    return acc;
  }, []);

  const { stdout } = await execa('docker', ['ps', '--quiet'].concat(namesCmd));
  const runningNodeIds = stdout.split(/\r?\n/).filter((s) => s);

  if (runningNodeIds.length) {
    if (options.kill) {
      log.info(chalk.bold('Killing running serverless containers.'));
      await execa('docker', ['kill'].concat(runningNodeIds));
    } else {
      throw createCliError(
        'ES has already been started, pass --kill to automatically stop the containers on startup.'
      );
    }
  } else {
    log.info('No running containers detected.');
  }
}

/**
 * Common setup for Docker and Serverless containers
 */
async function setupDocker({ log, options }: { log: ToolingLog; options: BaseOptions }) {
  await verifyDockerInstalled(log);
  await detectRunningNodes(log, options);
  await cleanUpDanglingContainers(log);
  await maybeCreateDockerNetwork(log);
}

/**
 * Pulls and prints info about the Docker image.
 */
async function setupDockerImage({ log, image }: { log: ToolingLog; image: string }) {
  await maybePullDockerImage(log, image);
  await printDockerImageInfo(log, image);
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

  // Configure mock identify provider (ES only supports SAML when running in SSL mode)
  if (
    ssl &&
    'kibanaUrl' in options &&
    options.kibanaUrl &&
    esArgs.get('xpack.security.enabled') !== 'false'
  ) {
    const trimTrailingSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

    // The mock IDP setup requires a custom role mapping, but since native role mappings are disabled by default in
    // Serverless, we have to re-enable them explicitly here.
    esArgs.set('xpack.security.authc.native_role_mappings.enabled', 'true');

    esArgs.set(`xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.order`, '0');
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.metadata.path`,
      `${SERVERLESS_CONFIG_PATH}idp_metadata.xml`
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.entity_id`,
      MOCK_IDP_ENTITY_ID
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.entity_id`,
      trimTrailingSlash(options.kibanaUrl)
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.acs`,
      `${trimTrailingSlash(options.kibanaUrl)}/api/security/saml/callback`
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.logout`,
      `${trimTrailingSlash(options.kibanaUrl)}/logout`
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.principal`,
      MOCK_IDP_ATTRIBUTE_PRINCIPAL
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.groups`,
      MOCK_IDP_ATTRIBUTE_ROLES
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.name`,
      MOCK_IDP_ATTRIBUTE_NAME
    );
    esArgs.set(
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.mail`,
      MOCK_IDP_ATTRIBUTE_EMAIL
    );

    if (options.uiam) {
      // HACK: A workaround for the Serverless ES metering service, which is enabled automatically after we set
      // `serverless.project_id`, and, if not configured _explicitly_ with an HTTP URL, expects CA certs in a
      // fixed location (`http-certs/ca.crt`) that we cannot override. So we just point it to Kibana as if it
      // were a metering service and use the longest possible interval to reduce noise.
      esArgs.set('metering.url', options.kibanaUrl);
      esArgs.set('metering.report_period', '60m');

      esArgs.set(
        `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.private_attributes`,
        [
          MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
          MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN_EXPIRES_AT,
          MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN,
          MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN_EXPIRES_AT,
        ].join(',')
      );

      esArgs.set('serverless.organization_id', MOCK_IDP_UIAM_ORGANIZATION_ID);
      esArgs.set('serverless.project_type', esProjectTypeFromKbn.get(options.projectType)!);
      esArgs.set('serverless.project_id', MOCK_IDP_UIAM_PROJECT_ID);

      esArgs.set('serverless.universal_iam_service.enabled', 'true');
      esArgs.set('serverless.universal_iam_service.url', MOCK_IDP_UIAM_SERVICE_INTERNAL_URL);
    }
  }

  const getEsProjectTypeValue = () => {
    const esProjectTypeParam = esArgs.get('serverless.project_type');
    if (esProjectTypeParam) {
      // parameter explicitly set, use that as first option
      return esProjectTypeParam;
    }
    if ('esProjectType' in options) {
      // esProjectType specified, pass that as parameter value
      return options.esProjectType;
    }
    if ('projectType' in options) {
      // determine ES project type from Kibana project type as fallback
      return esProjectTypeFromKbn.get(options.projectType);
    }
  };
  const esProjectTypeValue = getEsProjectTypeValue();
  if (esProjectTypeValue) {
    esArgs.set('serverless.project_type', esProjectTypeValue);
  }

  const javaOptions = esArgs.get('ES_JAVA_OPTS');
  if (javaOptions) {
    // Ensure the serverless refresh interval override flag is always present alongside any custom ES_JAVA_OPTS.
    if (!javaOptions.includes(ES_REFRESH_INTERVAL_OVERRIDE_FLAG)) {
      esArgs.set('ES_JAVA_OPTS', `${javaOptions} ${ES_REFRESH_INTERVAL_OVERRIDE_FLAG}`.trim());
    }
  } else {
    esArgs.set('ES_JAVA_OPTS', ES_REFRESH_INTERVAL_OVERRIDE_FLAG);
  }

  return Array.from(esArgs).flatMap((e) => ['--env', e.join('=')]);
}

export function getESp12Volume() {
  return ['--volume', `${ES_P12_PATH}:${SERVERLESS_CONFIG_PATH}certs/elasticsearch.p12`];
}

/**
 * Removes REPO_ROOT from hostPath. Keep the rest to avoid filename collisions.
 * Returns the path where a file will be mounted inside the ES or ES serverless container.
 * /root/kibana/package/foo/bar.json => /usr/share/elasticsearch/files/package/foo/bar.json
 */
export function getDockerFileMountPath(hostPath: string) {
  return join(SERVERLESS_FILES_PATH, hostPath.replace(REPO_ROOT, ''));
}

/**
 * Setup local volumes for Serverless ES
 */
export async function setupServerlessVolumes(log: ToolingLog, options: ServerlessOptions) {
  const {
    basePath,
    clean,
    ssl,
    kibanaUrl,
    files,
    resources,
    projectType,
    productTier,
    dataPath = 'stateless',
  } = options;
  const objectStorePath = resolve(basePath, dataPath);

  log.info(chalk.bold(`Checking for local serverless ES object store at ${objectStorePath}`));
  log.indent(4);

  let exists = null;
  try {
    await Fsp.access(objectStorePath);
    exists = true;
  } catch (e) {
    exists = false;
  }
  if (clean && exists) {
    log.info('Cleaning existing object store.');
    try {
      await Fsp.rm(objectStorePath, { recursive: true, force: true });
    } catch (error) {
      // Fall back to sudo if needed, CI user can have issues removing old state
      await execa('sudo', ['rm', '-rf', objectStorePath]);
    }
  }

  if (clean || !exists) {
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

  const volumeCmds = [
    '--volume',
    `${basePath}:/objectstore:z`,
    '--env',
    `stateless.object_store.bucket=${dataPath}`,
  ];

  if (files) {
    const _files = typeof files === 'string' ? [files] : files;
    const fileCmds = _files.reduce<string[]>((acc, filePath) => {
      acc.push('--volume', `${filePath}:${getDockerFileMountPath(filePath)}:z`);

      return acc;
    }, []);

    volumeCmds.push(...fileCmds);
  }

  const resourceFileOverrides: Record<string, string> = resources
    ? (Array.isArray(resources) ? resources : [resources]).reduce((acc, filePath) => {
        acc[basename(filePath)] = resolve(process.cwd(), filePath);
        return acc;
      }, {} as Record<string, string>)
    : {};

  const tierSpecificRolesFileExists = (filePath: string): boolean => {
    try {
      return existsSync(filePath);
    } catch (e) {
      return false;
    }
  };

  // Read roles for the specified projectType
  const tierSpecificRolesResourcePath =
    productTier && resolve(SERVERLESS_ROLES_ROOT_PATH, projectType, productTier, 'roles.yml');
  const rolesResourcePath =
    tierSpecificRolesResourcePath && tierSpecificRolesFileExists(tierSpecificRolesResourcePath)
      ? tierSpecificRolesResourcePath
      : resolve(SERVERLESS_ROLES_ROOT_PATH, projectType, 'roles.yml');

  const resourcesPaths = [...SERVERLESS_RESOURCES_PATHS, rolesResourcePath];

  const serverlessResources = resourcesPaths.reduce<string[]>((acc, path) => {
    const fileName = basename(path);
    let localFilePath = path;

    if (resourceFileOverrides[fileName]) {
      localFilePath = resourceFileOverrides[fileName];
      log.info(`'${fileName}' resource overridden with: ${localFilePath}`);
      delete resourceFileOverrides[fileName];
    }

    acc.push('--volume', `${localFilePath}:${SERVERLESS_CONFIG_PATH}${fileName}`);

    return acc;
  }, []);

  if (Object.keys(resourceFileOverrides).length > 0) {
    throw new Error(
      `Unsupported ES serverless --resources value(s):\n  ${Object.values(
        resourceFileOverrides
      ).join('  \n')}\n\nValid resources: ${resourcesPaths
        .map((filePath) => basename(filePath))
        .join(' | ')}`
    );
  }

  // Create and add meta data for mock identity provider
  if (ssl && kibanaUrl) {
    const metadata = await createMockIdpMetadata(kibanaUrl);
    await Fsp.writeFile(SERVERLESS_IDP_METADATA_PATH, metadata);
    volumeCmds.push(
      '--volume',
      `${SERVERLESS_IDP_METADATA_PATH}:${SERVERLESS_CONFIG_PATH}idp_metadata.xml:z`
    );
  }

  volumeCmds.push(
    ...getESp12Volume(),
    ...serverlessResources,
    ...(await getOperatorVolume(esProjectTypeFromKbn.get(projectType)!)),

    '--volume',
    `${
      ssl ? SERVERLESS_SECRETS_SSL_PATH : SERVERLESS_SECRETS_PATH
    }:${SERVERLESS_CONFIG_PATH}secrets/secrets.json:z`,
    '--volume',
    `${SERVERLESS_JWKS_PATH}:${SERVERLESS_CONFIG_PATH}jwks/jwks.json:z`
  );

  return volumeCmds;
}

/**
 * Resolve the Serverless ES image based on defaults and CLI options
 */
function getServerlessImage({ image, tag }: ImageOptions) {
  return resolveDockerImage({
    image,
    tag,
    repo: ES_SERVERLESS_REPO_ELASTICSEARCH,
    defaultImg: ES_SERVERLESS_DEFAULT_IMAGE,
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

function getESClient(clientOptions: ClientOptions): Client {
  return new Client({
    Connection: HttpConnection,
    requestTimeout: 30_000,
    ...clientOptions,
  });
}

/**
 * Runs an ES Serverless Cluster through Docker
 */
export async function runServerlessCluster(log: ToolingLog, options: ServerlessOptions) {
  await setupDocker({ log, options });

  const esServerlessImage = getServerlessImage({ image: options.image, tag: options.tag });
  await Promise.all([
    setupDockerImage({ log, image: esServerlessImage }),
    ...(options.uiam ? UIAM_CONTAINERS.map(({ image }) => setupDockerImage({ log, image })) : []),
  ]);

  const volumeCmd = await setupServerlessVolumes(log, options);
  const portCmd = resolvePort(options);

  // This is where nodes are started
  const nodeNames = await Promise.all(
    SERVERLESS_NODES.map(async (node, i) => {
      await runServerlessEsNode(log, {
        ...node,
        image: esServerlessImage,
        params: node.params.concat(
          resolveEsArgs(DEFAULT_SERVERLESS_ESARGS.concat(node.esArgs ?? []), options),
          i === 0 ? portCmd : [],
          volumeCmd
        ),
      });
      return node.name;
    }).concat(
      options.uiam ? UIAM_CONTAINERS.map((container) => runUiamContainer(log, container)) : []
    )
  );

  log.success(`Serverless ES cluster running.
  Login with username ${chalk.bold.cyan(ELASTIC_SERVERLESS_SUPERUSER)} or ${chalk.bold.cyan(
    SYSTEM_INDICES_SUPERUSER
  )} and password ${chalk.bold.magenta(ELASTIC_SERVERLESS_SUPERUSER_PASSWORD)}
  See src/platform/packages/shared/kbn-es/src/serverless_resources/README.md for additional information on authentication.
  Stop the cluster:     ${chalk.bold(`docker container stop ${nodeNames.join(' ')}`)}
    `);

  if (!options.skipTeardown) {
    // SIGINT will not trigger in FTR (see cluster.runServerless for FTR signal)
    process.on('SIGINT', () => teardownServerlessClusterSync(log, options));
  }

  if (options.uiam) {
    await initializeUiamContainers(log);
  }

  const esNodeUrl = `${options.ssl ? 'https' : 'http'}://${portCmd[1].substring(
    0,
    portCmd[1].lastIndexOf(':')
  )}`;

  const client = getESClient({
    node: esNodeUrl,
    auth: {
      username: ELASTIC_SERVERLESS_SUPERUSER,
      password: ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
    },
    ...(options.ssl
      ? {
          tls: {
            ca: [fs.readFileSync(CA_CERT_PATH)],
            // NOTE: Even though we've added ca into the tls options, we are using 127.0.0.1 instead of localhost
            // for the ip which is not validated. As such we are getting the error
            // Hostname/IP does not match certificate's altnames: IP: 127.0.0.1 is not in the cert's list:
            // To work around that we are overriding the function checkServerIdentity too
            checkServerIdentity: () => {
              return undefined;
            },
          },
        }
      : {}),
  });

  const readyPromise = waitUntilClusterReady({ client, expectedStatus: 'green', log }).then(
    async () => {
      if (!options.ssl || !options.kibanaUrl) {
        return;
      }

      await ensureSAMLRoleMapping(client);

      log.success(
        `Created role mapping for mock identity provider. You can now login using ${chalk.bold.cyan(
          MOCK_IDP_REALM_NAME
        )} realm`
      );
    }
  );

  if (options.waitForReady) {
    log.info('Waiting until ES is ready to serve requests...');
    await readyPromise;
    if (!options.esArgs || !options.esArgs.includes('xpack.security.enabled=false')) {
      // If security is not disabled, make sure the security index exists before running the test to avoid flakiness
      await waitForSecurityIndex({ client, log });
    }
  }

  if (!options.background) {
    // The serverless cluster has to be started detached, so we attach a logger afterwards for output
    await execa('docker', ['logs', '-f', SERVERLESS_NODES[0].name], {
      // inherit is required to show Docker output and Java console output for pw, enrollment token, etc
      stdio: ['ignore', 'inherit', 'inherit'],
    }).catch(() => {
      /**
       * docker logs will throw errors when the nodes are killed through SIGINT
       * and the entrypoint doesn't exit normally, so we silence the errors.
       */
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
 * Kill any serverless ES nodes and UIAM related containers which are running.
 */
export function teardownServerlessClusterSync(log: ToolingLog, options: ServerlessOptions) {
  const imagesToKillContainersFor = [
    getServerlessImage(options),
    ...(options.uiam ? UIAM_CONTAINERS.map(({ image }) => image) : []),
  ];
  const { stdout } = execa.commandSync(
    `docker ps --filter status=running ${imagesToKillContainersFor
      .map((image) => `--filter ancestor=${image}`)
      .join(' ')} --quiet`
  );
  // Filter empty strings
  const runningNodes = stdout.split(/\r?\n/).filter((s) => s);

  if (runningNodes.length) {
    log.info('Killing running serverless containers.');

    execa.commandSync(`docker kill ${runningNodes.join(' ')}`);
  }
}

/**
 * Resolve the Elasticsearch image based on defaults and CLI options
 */
function getDockerImage({ image, tag }: ImageOptions) {
  return resolveDockerImage({
    image,
    tag,
    repo: DOCKER_REPO,
    defaultImg: DOCKER_IMG,
  });
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
    await setupDocker({ log, options });
    image = getDockerImage({ image: options.image, tag: options.tag });
    await setupDockerImage({ log, image });
  }

  const dockerCmd = resolveDockerCmd(options, image);

  log.info(chalk.dim(`docker ${dockerCmd.join(' ')}`));
  await execa('docker', dockerCmd, {
    // inherit is required to show Docker output and Java console output for pw, enrollment token, etc
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

/**
 * A volume mount for the operator folder, that contains operator specific configuration files like settings.json.
 * We mount entire folder since Elasticsearch cannot properly watch changes in bind-mounted files.
 * @param projectType Type of the serverless project.
 */
async function getOperatorVolume(projectType: string) {
  await Fsp.mkdir(SERVERLESS_OPERATOR_PATH, { recursive: true });

  // Settings should include information about the project that's normally populated by the Elasticsearch Controller.
  const projectInfo = {
    id: MOCK_IDP_UIAM_PROJECT_ID,
    type: projectType,
    alias: 'local_project',
    organization: MOCK_IDP_UIAM_ORGANIZATION_ID,
  };
  const projectTags = {
    ...Object.fromEntries(Object.entries(projectInfo).map(([key, value]) => [`_${key}`, value])),
    env: 'local',
  };

  await Fsp.writeFile(
    join(SERVERLESS_OPERATOR_PATH, 'settings.json'),
    JSON.stringify(
      {
        metadata: { version: '100', compatibility: '' },
        state: { project: { ...projectInfo, tags: projectTags } },
      },
      null,
      2
    )
  );
  return ['--volume', `${SERVERLESS_OPERATOR_PATH}:${SERVERLESS_CONFIG_PATH}operator`];
}
