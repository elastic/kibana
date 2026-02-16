/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFile, mkdir } from 'fs/promises';
import { fetch } from 'undici';
import { join } from 'path';
import {
  generateCosmosDBApiRequestHeaders,
  MOCK_IDP_UIAM_COSMOS_DB_ACCESS_KEY,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS,
  MOCK_IDP_UIAM_COSMOS_DB_INTERNAL_URL,
  MOCK_IDP_UIAM_COSMOS_DB_NAME,
  MOCK_IDP_UIAM_COSMOS_DB_URL,
  MOCK_IDP_UIAM_SERVICE_INTERNAL_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
  MOCK_IDP_UIAM_SIGNING_SECRET,
} from '@kbn/mock-idp-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import execa from 'execa';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { Agent } from 'undici';
import type { ArrayElement } from '@kbn/utility-types';
import { REPO_ROOT } from '@kbn/repo-info';
import { SERVERLESS_UIAM_ENTRYPOINT_PATH, SERVERLESS_UIAM_CERTIFICATE_BUNDLE_PATH } from '../paths';

const COSMOS_DB_EMULATOR_DOCKER_REGISTRY = 'mcr.microsoft.com';
const COSMOS_DB_EMULATOR_DOCKER_REPO = `${COSMOS_DB_EMULATOR_DOCKER_REGISTRY}/cosmosdb/linux/azure-cosmos-emulator`;

// Check new version at https://github.com/Azure/azure-cosmos-db-emulator-docker/releases. DON'T use the rolling
// `vnext-preview` image tag.
const COSMOS_DB_EMULATOR_DOCKER_LATEST_VERIFIED_TAG = 'vnext-EN20251223';
export const COSMOS_DB_EMULATOR_DEFAULT_IMAGE = `${COSMOS_DB_EMULATOR_DOCKER_REPO}:${COSMOS_DB_EMULATOR_DOCKER_LATEST_VERIFIED_TAG}`;

const UIAM_DOCKER_REGISTRY = 'docker.elastic.co';
const UIAM_DOCKER_PROMOTED_REPO = `${UIAM_DOCKER_REGISTRY}/kibana-ci/uiam`;

// Use the promoted :latest-verified image in CI, fall back to specific tag for local development
export const UIAM_DEFAULT_IMAGE = `${UIAM_DOCKER_PROMOTED_REPO}:latest-verified`;

const MAX_HEALTHCHECK_RETRIES = 30;

const ENV_DEFAULTS = {
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

      '--volume',
      `${SERVERLESS_UIAM_CERTIFICATE_BUNDLE_PATH}:/scripts/certs/uiam_cosmosdb.pfx:z`,

      '-p',
      `127.0.0.1:${new URL(MOCK_IDP_UIAM_COSMOS_DB_INTERNAL_URL)?.port}:8081`, // Cosmos DB gateway
      '-p',
      `127.0.0.1:${env.UIAM_COSMOS_DB_UI_PORT}:1234`, // Cosmos DB emulator UI

      '--env',
      'AZURE_COSMOS_EMULATOR_PARTITION_COUNT=1',
      '--env',
      'AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=false',
      '--env',
      'GATEWAY_PUBLIC_ENDPOINT=uiam-cosmosdb',
      '--env',
      'CERT_PATH=/scripts/certs/uiam_cosmosdb.pfx',
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
      'elastic',

      '--volume',
      `${SERVERLESS_UIAM_ENTRYPOINT_PATH}:/opt/jboss/container/java/run/run-java-with-custom-ca.sh:z`,

      '--volume',
      `${SERVERLESS_UIAM_CERTIFICATE_BUNDLE_PATH}:/tmp/uiam_cosmosdb.pfx:z`,

      '-p',
      `127.0.0.1:${new URL(MOCK_IDP_UIAM_SERVICE_INTERNAL_URL)?.port}:8080`, // UIAM API port

      '--entrypoint',
      '/opt/jboss/container/java/run/run-java-with-custom-ca.sh',

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
      `uiam.cosmos.account.access_key=${MOCK_IDP_UIAM_COSMOS_DB_ACCESS_KEY}`,
      '--env',
      `uiam.cosmos.account.endpoint=${MOCK_IDP_UIAM_COSMOS_DB_INTERNAL_URL}`,
      '--env',
      `uiam.cosmos.container.apikey=${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS}`,
      '--env',
      `uiam.cosmos.container.token_invalidation=${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION}`,
      '--env',
      `uiam.cosmos.container.users=${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS}`,
      '--env',
      `uiam.cosmos.database=${MOCK_IDP_UIAM_COSMOS_DB_NAME}`,
      '--env',
      'uiam.cosmos.gateway_connection_mode=true',
      '--env',
      `uiam.internal.shared.secrets=${MOCK_IDP_UIAM_SHARED_SECRET}`,
      '--env',
      `uiam.tokens.jwt.signature.secrets=${MOCK_IDP_UIAM_SIGNING_SECRET}`,
      '--env',
      `uiam.tokens.jwt.signing.secret=${MOCK_IDP_UIAM_SIGNING_SECRET}`,

      '--env',
      'uiam.tokens.jwt.verify.clock.skew=PT2S',

      '--env',
      'uiam.tokens.refresh.grace_period=PT3S',

      '--health-cmd',
      'timeout 1 bash -c "</dev/tcp/localhost/8080"',
    ],
    cmdParams: [],
  },
];

/**
 * Run a single UIAM-related container.
 */
export async function runUiamContainer(
  log: ToolingLog,
  container: ArrayElement<typeof UIAM_CONTAINERS>
) {
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
    await setTimeoutAsync(2000);

    healthcheckRetries++;
    if (healthcheckRetries >= MAX_HEALTHCHECK_RETRIES) {
      await tryExportLogs(container.name, log);
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

  return container.name;
}

export async function initializeUiamContainers(log: ToolingLog) {
  const fetchDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

  log.info(
    chalk.bold(
      `Initializing Cosmos DB (${MOCK_IDP_UIAM_COSMOS_DB_URL}/${MOCK_IDP_UIAM_COSMOS_DB_NAME})…`
    )
  );

  // 1. Create database.
  const dbRes = await fetch(`${MOCK_IDP_UIAM_COSMOS_DB_URL}/dbs`, {
    method: 'POST',
    headers: generateCosmosDBApiRequestHeaders('POST', 'dbs', ''),
    body: JSON.stringify({ id: MOCK_IDP_UIAM_COSMOS_DB_NAME }),
    dispatcher: fetchDispatcher,
  });

  if (dbRes.status === 201) {
    log.info(chalk.green(`✓ Database (${MOCK_IDP_UIAM_COSMOS_DB_NAME}) created successfully`));
  } else if (dbRes.status === 409) {
    log.info(chalk.yellow(`✓ Database (${MOCK_IDP_UIAM_COSMOS_DB_NAME}) already exists`));
  } else {
    throw new Error(
      `Failed to create database (${MOCK_IDP_UIAM_COSMOS_DB_NAME}): ${
        dbRes.status
      } ${await dbRes.text()}`
    );
  }

  // 2. Create collections.
  for (const collection of [
    MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS,
    MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS,
    MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_TOKEN_INVALIDATION,
  ]) {
    log.info(chalk.bold(`Creating a Cosmos DB collection (${collection})…`));

    const collectionRes = await fetch(
      `${MOCK_IDP_UIAM_COSMOS_DB_URL}/dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls`,
      {
        method: 'POST',
        headers: generateCosmosDBApiRequestHeaders(
          'POST',
          'colls',
          `dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}`
        ),
        body: JSON.stringify({ id: collection, partitionKey: { paths: ['/id'], kind: 'Hash' } }),
        dispatcher: fetchDispatcher,
      }
    );

    if (collectionRes.status === 201) {
      log.info(chalk.green(`✓ Collection (${collection}) created successfully`));
    } else if (collectionRes.status === 409) {
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
      `Cosmos DB (${MOCK_IDP_UIAM_COSMOS_DB_URL}/${MOCK_IDP_UIAM_COSMOS_DB_NAME}) has been successfully initialized.`
    )
  );
}

async function tryExportLogs(containerName: string, log: ToolingLog) {
  try {
    const { stdout: logs } = await execa('docker', ['logs', containerName]);
    await mkdir(join(REPO_ROOT, '.es'), {
      recursive: true,
    });
    return writeFile(join(REPO_ROOT, '.es', 'uiam_docker_error.log'), logs);
  } catch (err) {
    log.error(`Failed to export logs for container ${containerName}: ${err}`);
  }
}
