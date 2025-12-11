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
import {
  assertMinikubeAvailable,
  assertKubectlAvailable,
  ensureMinikubeRunning,
  waitForPodsReady,
  deleteNamespace,
  getMinikubeIp,
} from './util/assert_minikube_available';
import { getKubernetesManifests } from './get_kubernetes_manifests';
import { getFullOtelCollectorConfig } from './get_otel_collector_config';
import { writeFile } from './util/file_utils';
import { readKibanaConfig } from './read_kibana_config';
import { enableStreams } from './util/enable_streams';

const DATA_DIR = Path.join(REPO_ROOT, 'data', 'otel_demo');
const MANIFESTS_FILE_PATH = Path.join(DATA_DIR, 'otel-demo.yaml');
const NAMESPACE = 'otel-demo';

/**
 * Stops and removes the OTel Demo from Kubernetes.
 */
async function down(log: ToolingLog) {
  log.info('Stopping OTel Demo...');
  await deleteNamespace(NAMESPACE);
  // Also delete the ClusterRole and ClusterRoleBinding
  await execa
    .command('kubectl delete clusterrole otel-collector --ignore-not-found')
    .catch(() => {});
  await execa
    .command('kubectl delete clusterrolebinding otel-collector --ignore-not-found')
    .catch(() => {});
}

/**
 * Normalizes Elasticsearch host URL for Kubernetes connectivity.
 * Converts localhost references to the host machine IP accessible from minikube.
 *
 * @param host - The Elasticsearch host URL
 * @returns Normalized endpoint URL
 */
function normalizeElasticsearchHost(host: string): string {
  let hostStr = host.toString();

  // For minikube, localhost needs to be the host machine's IP
  // minikube can reach the host at host.minikube.internal or via the bridge
  hostStr = hostStr.replace(/localhost/g, 'host.minikube.internal');

  if (hostStr.startsWith('http://') || hostStr.startsWith('https://')) {
    return hostStr;
  }

  return `http://${hostStr}`;
}

/**
 * Ensures the OpenTelemetry Demo is running on Kubernetes (minikube) with
 * telemetry data being sent to Elasticsearch.
 *
 * This function:
 * 1. Ensures minikube is running
 * 2. Reads Elasticsearch configuration from kibana.dev.yml
 * 3. Enables the streams feature in Kibana (sets up logs index)
 * 4. Generates OTel Collector configuration with k8sattributes processor
 * 5. Generates Kubernetes manifests for the OTel Demo
 * 6. Deploys to minikube using kubectl
 *
 * @param log - Tooling logger for output
 * @param signal - Abort signal for cleanup
 * @param configPath - Optional path to Kibana config file
 * @param logsIndex - Index name for logs (defaults to "logs")
 * @param teardown - If true, stops and removes the deployment
 */
export async function ensureOtelDemo({
  log,
  signal,
  configPath,
  logsIndex = 'logs',
  teardown = false,
}: {
  log: ToolingLog;
  signal: AbortSignal;
  configPath?: string | undefined;
  logsIndex?: string;
  teardown?: boolean;
}) {
  await assertKubectlAvailable();
  await assertMinikubeAvailable();

  if (teardown) {
    await down(log);
    log.success('OTel Demo stopped and removed from Kubernetes');
    return;
  }

  log.info('Starting OpenTelemetry Demo on Kubernetes (minikube)...');

  // Ensure minikube is running
  log.info('Ensuring minikube is running...');
  await ensureMinikubeRunning();

  // Read Kibana configuration to get Elasticsearch and Kibana server credentials
  const kibanaConfig = readKibanaConfig(log, configPath);
  const elasticsearchConfig = kibanaConfig.elasticsearch;
  const serverConfig = kibanaConfig.server;

  const elasticsearchHost = normalizeElasticsearchHost(elasticsearchConfig.hosts);
  const elasticsearchUsername = elasticsearchConfig.username;
  const elasticsearchPassword = elasticsearchConfig.password;

  const kibanaUrl = `http://${serverConfig.host}:${serverConfig.port}`;

  log.info(`Kibana: ${kibanaUrl}`);
  log.info(`Elasticsearch: ${elasticsearchHost}`);
  log.info(`Logs index: ${logsIndex}`);

  // Enable streams in Kibana (sets up the logs index)
  await enableStreams({
    kibanaUrl,
    username: elasticsearchUsername,
    password: elasticsearchPassword,
    log,
  });

  // Stop any existing deployment
  log.debug('Removing existing deployment');
  await down(log);

  // Generate OTel Collector configuration
  const collectorConfig = getFullOtelCollectorConfig({
    elasticsearchEndpoint: elasticsearchHost,
    username: elasticsearchUsername,
    password: elasticsearchPassword,
    logsIndex,
  });

  // Generate Kubernetes manifests
  log.info('Generating Kubernetes manifests...');
  const manifests = getKubernetesManifests({
    elasticsearchEndpoint: elasticsearchHost,
    username: elasticsearchUsername,
    password: elasticsearchPassword,
    logsIndex,
    collectorConfigYaml: collectorConfig,
  });

  log.debug(`Writing manifests to ${MANIFESTS_FILE_PATH}`);
  await writeFile(MANIFESTS_FILE_PATH, manifests);

  // Apply the manifests
  log.info('Deploying to Kubernetes...');
  await execa.command(`kubectl apply -f ${MANIFESTS_FILE_PATH}`, {
    stdio: 'inherit',
  });

  // Wait for pods to be ready
  log.info('Waiting for pods to be ready (this may take a few minutes)...');

  const waitAndReport = async () => {
    try {
      await waitForPodsReady(NAMESPACE, 300);

      const minikubeIp = await getMinikubeIp();

      log.write('');
      log.write(
        `${chalk.green('✔')} OTel Demo deployed successfully and connected to ${elasticsearchHost}`
      );
      log.write('');
      log.write(`  ${chalk.bold('Web Store:')}        http://${minikubeIp}:30080`);
      log.write(`  ${chalk.bold('Logs Index:')}       ${logsIndex}`);
      log.write('');
      log.write(chalk.dim('  To access the frontend, run:'));
      log.write(chalk.dim(`    minikube service frontend-external -n ${NAMESPACE}`));
      log.write('');
      log.write(chalk.dim('  To view pod logs:'));
      log.write(chalk.dim(`    kubectl logs -f -n ${NAMESPACE} -l app=frontend`));
      log.write('');
      log.write(chalk.dim('  To stop the demo:'));
      log.write(chalk.dim('    node scripts/otel_demo.js --teardown'));
      log.write('');
    } catch (error) {
      log.error(`Failed to deploy: ${error}`);
    }
  };

  await waitAndReport();

  // Keep the process running to show logs (limit to key services)
  log.info('Streaming pod logs (Ctrl+C to stop)...');
  try {
    await execa.command(
      `kubectl logs -f -n ${NAMESPACE} -l app=otel-collector --max-log-requests=10`,
      {
        stdio: 'inherit',
        cleanup: true,
      }
    );
  } catch {
    // User pressed Ctrl+C or signal received
    log.info('Stopped log streaming');
  }
}
