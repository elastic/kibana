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
import { getScenarioById, type FailureScenario } from './failure_scenarios';

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
 * @param scenarioIds - Optional list of failure scenario IDs to apply
 */
export async function ensureOtelDemo({
  log,
  signal,
  configPath,
  logsIndex = 'logs',
  teardown = false,
  scenarioIds = [],
}: {
  log: ToolingLog;
  signal: AbortSignal;
  configPath?: string | undefined;
  logsIndex?: string;
  teardown?: boolean;
  scenarioIds?: string[];
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

  const kibanaUrl = `http://${serverConfig.host}:${serverConfig.port}${serverConfig.basePath}`;

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

  // Process failure scenarios
  const activeScenarios: FailureScenario[] = [];
  const envOverrides: Record<string, Record<string, string>> = {};

  for (const id of scenarioIds) {
    const scenario = getScenarioById(id);
    if (scenario) {
      activeScenarios.push(scenario);
      log.info(`Applying failure scenario: ${chalk.yellow(scenario.name)}`);
      log.info(`  ${chalk.dim(scenario.description.split('\n')[0])}`);

      // Collect env overrides from steps
      for (const step of scenario.steps) {
        if (step.type === 'env') {
          if (!envOverrides[step.service]) {
            envOverrides[step.service] = {};
          }
          envOverrides[step.service][step.variable] = step.value;
          log.debug(`  ${step.service}: ${step.variable}=${step.value}`);
        }
      }
    }
  }

  if (activeScenarios.length > 0) {
    log.write('');
    log.warning(
      `${chalk.bold(activeScenarios.length)} failure scenario(s) active - expect degraded behavior!`
    );
    log.write('');
  }

  // Generate OTel Collector configuration
  const collectorConfig = getFullOtelCollectorConfig({
    elasticsearchEndpoint: elasticsearchHost,
    username: elasticsearchUsername,
    password: elasticsearchPassword,
    logsIndex,
  });

  // Generate Kubernetes manifests with scenario overrides
  log.info('Generating Kubernetes manifests...');
  const manifests = getKubernetesManifests({
    elasticsearchEndpoint: elasticsearchHost,
    username: elasticsearchUsername,
    password: elasticsearchPassword,
    logsIndex,
    collectorConfigYaml: collectorConfig,
    envOverrides,
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
      if (activeScenarios.length > 0) {
        log.write(
          `  ${chalk.bold('Active Scenarios:')} ${chalk.yellow(
            activeScenarios.map((s) => s.id).join(', ')
          )}`
        );
      }
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

/**
 * Default environment values for services (used for reset)
 */
const SERVICE_DEFAULTS: Record<string, Record<string, string>> = {
  cart: {
    VALKEY_ADDR: 'valkey:6379',
    FLAGD_HOST: 'flagd',
  },
  checkout: {
    GOMEMLIMIT: '16MiB',
    CURRENCY_SERVICE_ADDR: 'currency:7285',
    PAYMENT_SERVICE_ADDR: 'payment:50051',
  },
  frontend: {
    CURRENCY_SERVICE_ADDR: 'currency:7285',
    PRODUCT_CATALOG_SERVICE_ADDR: 'product-catalog:3550',
    WEB_OTEL_SERVICE_NAME: 'frontend-web',
    OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4317',
  },
  'load-generator': {
    LOCUST_USERS: '10',
  },
  recommendation: {
    OTEL_SERVICE_NAME: 'recommendation',
    FLAGD_HOST: 'flagd',
  },
  payment: {
    FLAGD_HOST: 'flagd',
  },
};

/**
 * Patches failure scenarios onto a running OTel Demo cluster.
 * Uses kubectl set env to update deployments without full redeployment.
 *
 * @param log - Tooling logger for output
 * @param scenarioIds - List of scenario IDs to apply (empty = no changes unless reset)
 * @param reset - If true, resets all services to defaults
 */
export async function patchScenarios({
  log,
  scenarioIds = [],
  reset = false,
}: {
  log: ToolingLog;
  scenarioIds?: string[];
  reset?: boolean;
}) {
  await assertKubectlAvailable();

  // Check if namespace exists
  try {
    await execa.command(`kubectl get namespace ${NAMESPACE}`);
  } catch {
    throw new Error(
      `Namespace ${NAMESPACE} not found. Run 'node scripts/otel_demo.js' first to deploy.`
    );
  }

  if (reset) {
    log.info('Resetting all scenarios to defaults...');

    // Reset all services to their default values
    for (const [service, defaults] of Object.entries(SERVICE_DEFAULTS)) {
      const envArgs = Object.entries(defaults)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');

      log.debug(`Resetting ${service}: ${envArgs}`);
      try {
        await execa.command(`kubectl set env deployment/${service} -n ${NAMESPACE} ${envArgs}`, {
          stdio: 'pipe',
        });
        log.info(`  ${chalk.green('✔')} Reset ${service}`);
      } catch (error) {
        log.warning(`  ${chalk.yellow('⚠')} Could not reset ${service} (may not exist)`);
      }
    }

    log.success('All scenarios reset to defaults');
    return;
  }

  if (scenarioIds.length === 0) {
    log.warning('No scenarios specified. Use --scenario or --reset');
    return;
  }

  // Collect env changes per service
  const envChanges: Record<string, Record<string, string>> = {};

  for (const id of scenarioIds) {
    const scenario = getScenarioById(id);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${id}`);
    }

    log.info(`Applying scenario: ${chalk.yellow(scenario.name)}`);
    log.info(`  ${chalk.dim(scenario.description.split('\n')[0])}`);

    for (const step of scenario.steps) {
      if (step.type === 'env') {
        if (!envChanges[step.service]) {
          envChanges[step.service] = {};
        }
        envChanges[step.service][step.variable] = step.value;
      }
    }
  }

  // Apply changes using kubectl set env
  for (const [service, envs] of Object.entries(envChanges)) {
    const envArgs = Object.entries(envs)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    log.debug(`Patching ${service}: ${envArgs}`);
    try {
      await execa.command(`kubectl set env deployment/${service} -n ${NAMESPACE} ${envArgs}`, {
        stdio: 'pipe',
      });
      log.info(`  ${chalk.green('✔')} Patched ${service}`);
    } catch (error) {
      log.error(`  ${chalk.red('✗')} Failed to patch ${service}: ${error}`);
    }
  }

  log.write('');
  log.success(`Applied ${scenarioIds.length} scenario(s). Pods will restart with new config.`);
  log.write('');
  log.write(chalk.dim('  To watch pod restarts:'));
  log.write(chalk.dim(`    kubectl get pods -n ${NAMESPACE} -w`));
  log.write('');
  log.write(chalk.dim('  To reset to defaults:'));
  log.write(chalk.dim('    node scripts/otel_demo.js --reset'));
}
