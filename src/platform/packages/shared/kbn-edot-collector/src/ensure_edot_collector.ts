/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import Path from 'path';
import chalk from 'chalk';
import { REPO_ROOT } from '@kbn/repo-info';
import { assertDockerAvailable } from './util/assert_docker_available';
import { getDockerComposeYaml } from './get_docker_compose_yaml';
import { getEdotCollectorConfiguration } from './get_edot_collector_configuration';
import { writeFile } from './util/file_utils';
import { readKibanaConfig } from './read_kibana_config';
import { untilContainerReady } from './util/until_container_ready';

const DATA_DIR = Path.join(REPO_ROOT, 'data', 'edot_collector');
const DOCKER_COMPOSE_FILE_PATH = Path.join(DATA_DIR, 'docker-compose.yaml');
const COLLECTOR_CONFIG_FILE_PATH = Path.join(DATA_DIR, 'otel-collector-config.yml');

/**
 * Stops the EDOT Collector Docker containers.
 */
async function down() {
  await execa
    .command(`docker compose -f ${DOCKER_COMPOSE_FILE_PATH} down`, { cleanup: true })
    .catch(() => {});
}

/**
 * Normalizes Elasticsearch host URL to ensure it's a valid endpoint.
 * Converts localhost references to host.docker.internal for Docker connectivity.
 *
 * @param host - The Elasticsearch host URL
 * @returns Normalized endpoint URL
 */
function normalizeElasticsearchHost(host: string): string {
  let hostStr = host.toString();

  // Convert localhost to host.docker.internal for Docker connectivity
  hostStr = hostStr.replace(/localhost/g, 'host.docker.internal');

  if (hostStr.startsWith('http://') || hostStr.startsWith('https://')) {
    return hostStr;
  }

  return `http://${hostStr}`;
}

/**
 * Ensures the EDOT Collector (Elastic Distribution of OpenTelemetry Collector) is running in Gateway mode.
 * Reads configuration from kibana.dev.yml, generates EDOT Collector configuration,
 * and starts the Docker container.
 *
 * @param log - Tooling logger for output
 * @param signal - Abort signal for cleanup
 * @param grpcPort - Host port for gRPC endpoint (defaults to 4317)
 * @param httpPort - Host port for HTTP endpoint (defaults to 4318)
 */
export async function ensureEdotCollector({
  log,
  signal,
  configPath,
  grpcPort = 4317,
  httpPort = 4318,
}: {
  log: ToolingLog;
  signal: AbortSignal;
  configPath?: string | undefined;
  grpcPort?: number;
  httpPort?: number;
}) {
  log.info(`Ensuring EDOT Collector is available`);

  await assertDockerAvailable();

  // Read Kibana configuration to get Elasticsearch credentials
  const kibanaConfig = readKibanaConfig(log, configPath);
  const elasticsearchConfig = kibanaConfig.elasticsearch;

  const elasticsearchHost = normalizeElasticsearchHost(elasticsearchConfig.hosts);
  const elasticsearchUsername = elasticsearchConfig.username;
  const elasticsearchPassword = elasticsearchConfig.password;

  log.debug(`Stopping existing containers`);
  await down();

  const collectorConfig = getEdotCollectorConfiguration({
    elasticsearchEndpoint: elasticsearchHost,
    username: elasticsearchUsername,
    password: elasticsearchPassword,
  });

  log.debug(`Writing collector config to ${COLLECTOR_CONFIG_FILE_PATH}`);
  await writeFile(COLLECTOR_CONFIG_FILE_PATH, collectorConfig);

  const dockerComposeYaml = await getDockerComposeYaml({
    collectorConfigPath: COLLECTOR_CONFIG_FILE_PATH,
    grpcPort,
    httpPort,
    log,
  });

  log.debug(`Writing docker-compose file to ${DOCKER_COMPOSE_FILE_PATH}`);
  await writeFile(DOCKER_COMPOSE_FILE_PATH, dockerComposeYaml);

  // Wait for container to be running
  untilContainerReady({
    containerName: 'otel-collector',
    signal,
    log,
    dockerComposeFilePath: DOCKER_COMPOSE_FILE_PATH,
    condition: ['.State.Status', 'running'],
  })
    .then(() => {
      log.write('');

      log.write(
        `${chalk.green(
          '✔'
        )} EDOT Collector started successfully in Gateway mode and connected to ${elasticsearchHost}`
      );
      log.write('');
      log.write(`  ${chalk.dim('gRPC:')} http://localhost:${grpcPort}`);
      log.write(`  ${chalk.dim('HTTP:')} http://localhost:${httpPort}`);
      log.write('');
    })
    .catch((error) => {
      log.error(error);
    });

  // Start the Docker Compose services
  await execa.command(`docker compose -f ${DOCKER_COMPOSE_FILE_PATH} up`, {
    stdio: 'inherit',
    cleanup: true,
  });
}
