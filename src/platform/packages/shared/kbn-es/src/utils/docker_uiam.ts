/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_UIAM_SHARED_SECRET, MOCK_IDP_UIAM_SIGNING_SECRET } from '@kbn/mock-idp-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import execa from 'execa';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { Agent } from 'undici';
import { createHmac } from 'crypto';
import { SERVERLESS_UIAM_ENTRYPOINT_PATH } from '../paths';

const COSMOS_DB_EMULATOR_DOCKER_REGISTRY = 'mcr.microsoft.com';
const COSMOS_DB_EMULATOR_DOCKER_REPO = `${COSMOS_DB_EMULATOR_DOCKER_REGISTRY}/cosmosdb/linux/azure-cosmos-emulator`;
const COSMOS_DB_EMULATOR_DOCKER_LATEST_VERIFIED_TAG = 'vnext-preview';
const COSMOS_DB_EMULATOR_DEFAULT_IMAGE = `${COSMOS_DB_EMULATOR_DOCKER_REPO}:${COSMOS_DB_EMULATOR_DOCKER_LATEST_VERIFIED_TAG}`;

const UIAM_DOCKER_REGISTRY = 'docker.elastic.co';
const UIAM_DOCKER_REPO = `${UIAM_DOCKER_REGISTRY}/cloud-ci/uiam`;
// Taken from GitOps version file for UIAM service (dev env, services/uiam/versions.yaml)
const UIAM_DOCKER_LATEST_VERIFIED_TAG = 'git-fb324ba1e88f';
const UIAM_DEFAULT_IMAGE = `${UIAM_DOCKER_REPO}:${UIAM_DOCKER_LATEST_VERIFIED_TAG}`;

const UIAM_COSMOS_DB_NAME = 'uiam-db';
const UIAM_COSMOS_DB_VERSION = '2018-12-31';
const UIAM_COSMOS_DB_ACCESS_KEY =
  'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';
const UIAM_COSMOS_DB_COLLECTION_API_KEYS = 'api-keys';
const UIAM_COSMOS_DB_COLLECTION_USERS = 'users';
const UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION = 'token-invalidation';

const MAX_HEALTHCHECK_RETRIES = 15;

const ENV_DEFAULTS = {
  UIAM_API_PORT: '8090',
  UIAM_COSMOS_DB_GATEWAY_PORT: '8081',
  UIAM_COSMOS_DB_UI_PORT: '8082',
  UIAM_LOGGING_LEVEL: 'INFO',
};

const env = Object.fromEntries(
  Object.entries(ENV_DEFAULTS).map(([key, value]) => [key, String(process.env[key] || value)])
) as typeof ENV_DEFAULTS;

const SHARED_DOCKER_PARAMS = [
  'run',
  '--detach',
  '--interactive',
  '--tty',
  '--health-interval',
  '5s',
  '--health-timeout',
  '2s',
  '--health-retries',
  `${MAX_HEALTHCHECK_RETRIES}`,
  '--health-start-period',
  '3s',
];

export const UIAM_CONTAINERS = [
  {
    name: 'uiam-cosmosdb',
    image: process.env.UIAM_COSMOSDB_DOCKER_IMAGE || COSMOS_DB_EMULATOR_DEFAULT_IMAGE,
    params: [
      '--net',
      'elastic',

      '-p',
      `127.0.0.1:${env.UIAM_COSMOS_DB_GATEWAY_PORT}:8081`, // Cosmos DB gateway
      '-p',
      `127.0.0.1:${env.UIAM_COSMOS_DB_UI_PORT}:1234`, // Cosmos DB emulator UI
      '-p',
      `127.0.0.1:${env.UIAM_API_PORT}:8090`, // UIAM API port

      '--env',
      'AZURE_COSMOS_EMULATOR_PARTITION_COUNT=1',
      '--env',
      'AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=false',
      '--env',
      'LOG_LEVEL=error',

      '--health-cmd',
      'curl -sk http://127.0.0.1:8080/ready | grep -q "\\"overall\\": true"',
    ],
    cmdParams: ['--protocol', 'https', '--port', '8081'],
  },
  {
    name: 'uiam',
    image: process.env.UIAM_DOCKER_IMAGE || UIAM_DEFAULT_IMAGE,
    params: [
      '--net',
      'container:uiam-cosmosdb',

      '--volume',
      `${SERVERLESS_UIAM_ENTRYPOINT_PATH}:/opt/jboss/container/java/run/run-java-with-custom-ca.sh:z`,

      '--entrypoint',
      '/opt/jboss/container/java/run/run-java-with-custom-ca.sh',

      '--env',
      'quarkus.http.port=8090',
      '--env',
      'quarkus.http.ssl.certificate.key-store-provider=JKS',
      '--env',
      'quarkus.http.ssl.certificate.trust-store-provider=SUN',
      '--env',
      `quarkus.log.category."co".level=${env.UIAM_LOGGING_LEVEL}`,
      '--env',
      `quarkus.log.category."io".level=${env.UIAM_LOGGING_LEVEL}`,
      '--env',
      `quarkus.log.category."org".level=${env.UIAM_LOGGING_LEVEL}`,
      '--env',
      'quarkus.log.console.json.enabled=false',
      '--env',
      `quarkus.log.level=${env.UIAM_LOGGING_LEVEL}`,
      '--env',
      'quarkus.otel.sdk.disabled=true',
      '--env',
      'quarkus.profile=dev',
      '--env',
      'uiam.api_keys.decoder.prefixes=essu_dev',
      '--env',
      'uiam.api_keys.encoder.prefix=essu_dev',
      '--env',
      `uiam.cosmos.account.access_key=${UIAM_COSMOS_DB_ACCESS_KEY}`,
      '--env',
      `uiam.cosmos.account.endpoint=https://127.0.0.1:${env.UIAM_COSMOS_DB_GATEWAY_PORT}`,
      '--env',
      `uiam.cosmos.container.apikey=${UIAM_COSMOS_DB_COLLECTION_API_KEYS}`,
      '--env',
      `uiam.cosmos.container.token_invalidation=${UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION}`,
      '--env',
      `uiam.cosmos.container.users=${UIAM_COSMOS_DB_COLLECTION_USERS}`,
      '--env',
      `uiam.cosmos.database=${UIAM_COSMOS_DB_NAME}`,
      '--env',
      'uiam.cosmos.gateway_connection_mode=true',
      '--env',
      `uiam.internal.shared.secrets=${MOCK_IDP_UIAM_SHARED_SECRET}`,
      '--env',
      `uiam.tokens.jwt.signature.secrets=${MOCK_IDP_UIAM_SIGNING_SECRET}`,
      '--env',
      `uiam.tokens.jwt.signing.secret=${MOCK_IDP_UIAM_SIGNING_SECRET}`,

      '--health-cmd',
      'timeout 1 bash -c "</dev/tcp/localhost/8090"',
    ],
    cmdParams: [],
  },
];

/**
 * Run all necessary UIAM containers.
 */
export async function runUiamContainers(log: ToolingLog) {
  for (const container of UIAM_CONTAINERS) {
    const dockerCommand = SHARED_DOCKER_PARAMS.concat(
      container.params,
      ['--name', container.name],
      container.image,
      container.cmdParams
    );
    log.info(chalk.bold(`Running "${container.name}" container…`));
    log.indent(4, () => log.info(chalk.dim(`docker ${dockerCommand.join(' ')}`)));

    const { stdout: containerId } = await execa('docker', dockerCommand);

    let isHealthy = false;
    let healthcheckRetries = 0;
    while (!isHealthy) {
      let currentStatus;
      try {
        const { stdout: statusRaw } = await execa('docker', [
          'inspect',
          '-f',
          '{{.State.Health.Status}}',
          container.name,
        ]);

        currentStatus = statusRaw.trim();
        if (currentStatus === 'healthy') {
          isHealthy = true;
          break;
        }
      } catch (err) {
        currentStatus = `error: ${err}`;
      }

      log.info(chalk.bold(`Waiting for "${container.name}" container (${currentStatus})…`));
      await setTimeoutAsync(1000);

      healthcheckRetries++;
      if (healthcheckRetries >= MAX_HEALTHCHECK_RETRIES) {
        throw new Error(
          `The "${
            container.name
          }" container failed to start within the expected time. Last known status: ${currentStatus}. Check the logs with ${chalk.bold(
            `docker logs -f ${container.name}`
          )}`
        );
      }
    }

    log.indent(4, () =>
      log.info(`The "${container.name}" container is up and ready.
  Container Name: ${container.name}
  Container Id:   ${containerId}

  View logs:            ${chalk.bold(`docker logs -f ${container.name}`)}
  Shell access:         ${chalk.bold(`docker exec -it ${container.name} /bin/bash`)}
`)
    );
  }

  await initializeCosmosDb(log);

  return UIAM_CONTAINERS.map(({ name }) => name);
}

async function initializeCosmosDb(log: ToolingLog) {
  const COSMOS_DB_ENDPOINT = `https://127.0.0.1:${env.UIAM_COSMOS_DB_GATEWAY_PORT}`;

  const fetchDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

  log.info(chalk.bold(`Initializing Cosmos DB (${COSMOS_DB_ENDPOINT}/${UIAM_COSMOS_DB_NAME})…`));

  // 1. Create database.
  const dbDate = new Date().toUTCString();
  const dbRes = await fetch(`${COSMOS_DB_ENDPOINT}/dbs`, {
    method: 'POST',
    headers: generateCosmosDBApiRequestHeaders('POST', 'dbs', '', dbDate),
    body: JSON.stringify({ id: UIAM_COSMOS_DB_NAME }),
    // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
    dispatcher: fetchDispatcher,
  });

  if (dbRes.status === 201) {
    log.info(chalk.green(`✓ Database (${UIAM_COSMOS_DB_NAME}) created successfully`));
  } else if (dbRes.status === 409) {
    log.info(chalk.yellow(`✓ Database (${UIAM_COSMOS_DB_NAME}) already exists`));
  } else {
    throw new Error(
      `Failed to create database (${UIAM_COSMOS_DB_NAME}): ${dbRes.status} ${await dbRes.text()}`
    );
  }

  // 2. Create collections.
  for (const collection of [
    UIAM_COSMOS_DB_COLLECTION_USERS,
    UIAM_COSMOS_DB_COLLECTION_API_KEYS,
    UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION,
  ]) {
    log.info(chalk.bold(`Creating a Cosmos DB collection (${collection})…`));

    const collDate = new Date().toUTCString();
    const collectionRes = await fetch(`${COSMOS_DB_ENDPOINT}/dbs/${UIAM_COSMOS_DB_NAME}/colls`, {
      method: 'POST',
      headers: generateCosmosDBApiRequestHeaders(
        'POST',
        'colls',
        `dbs/${UIAM_COSMOS_DB_NAME}`,
        collDate
      ),
      body: JSON.stringify({ id: collection, partitionKey: { paths: ['/id'], kind: 'Hash' } }),
      // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
      dispatcher: fetchDispatcher,
    });

    if (dbRes.status === 201) {
      log.info(chalk.green(`✓ Collection (${collection}) created successfully`));
    } else if (dbRes.status === 409) {
      log.info(chalk.yellow(`✓ Collection (${collection}) already exists`));
    } else {
      throw new Error(
        `Failed to create collection (${collection}): ${
          collectionRes.status
        } ${await collectionRes.text()}`
      );
    }
  }

  log.info(
    chalk.bold(
      `Cosmos DB (${COSMOS_DB_ENDPOINT}/${UIAM_COSMOS_DB_NAME}) has been successfully initialized.`
    )
  );
}

function generateCosmosDBApiRequestHeaders(
  httpVerb: 'POST',
  resourceType: 'dbs' | 'colls',
  resourceId: string,
  timestamp: string
) {
  const key = Buffer.from(UIAM_COSMOS_DB_ACCESS_KEY, 'base64');

  // Cosmos DB expects all inputs in the string-to-sign to be lowercased
  // Format: Verb\nResourceType\nResourceID\nTimestamp\n\n
  const stringToSign =
    `${httpVerb.toLowerCase()}\n` +
    `${resourceType.toLowerCase()}\n` +
    `${resourceId}\n` +
    `${timestamp.toLowerCase()}\n` +
    `\n`;
  return {
    Authorization: encodeURIComponent(
      `type=master&ver=1.0&sig=${createHmac('sha256', key).update(stringToSign).digest('base64')}`
    ),
    'x-ms-date': timestamp,
    'x-ms-version': UIAM_COSMOS_DB_VERSION,
    'Content-Type': 'application/json',
  };
}
