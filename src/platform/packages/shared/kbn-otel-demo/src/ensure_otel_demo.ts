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
import { getFullOtelCollectorConfig } from './get_otel_collector_config';
import { writeFile } from './util/file_utils';
import { readKibanaConfig } from './read_kibana_config';
import { enableStreams } from './util/enable_streams';
import { createDataView } from './util/create_data_view';
import { resolveKibanaUrl } from './util/resolve_kibana_url';
import type { DemoType, FailureScenario } from './types';
import {
  getDemoConfig,
  getDemoManifests,
  getScenarioById,
  getDemoServiceDefaults,
} from './demo_registry';

const DATA_DIR = Path.join(REPO_ROOT, 'data', 'demo_environments');

/**
 * Stops and removes a demo environment from Kubernetes.
 */
async function down(log: ToolingLog, namespace: string, demoName: string) {
  log.info(`Stopping ${demoName}...`);
  await deleteNamespace(namespace);
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
 * Ensures a demo environment is running on Kubernetes (minikube) with
 * telemetry data being sent to Elasticsearch.
 *
 * This function:
 * 1. Ensures minikube is running
 * 2. Reads Elasticsearch configuration from kibana.dev.yml
 * 3. Enables the streams feature in Kibana (sets up logs index)
 * 4. Generates OTel Collector configuration with k8sattributes processor
 * 5. Generates Kubernetes manifests for the demo
 * 6. Deploys to minikube using kubectl
 *
 * @param log - Tooling logger for output
 * @param signal - Abort signal for cleanup
 * @param demoType - Type of demo to deploy (default: 'otel-demo')
 * @param configPath - Optional path to Kibana config file
 * @param logsIndex - Index name for logs (defaults to "logs")
 * @param version - Demo version (defaults to demo's defaultVersion)
 * @param teardown - If true, stops and removes the deployment
 * @param scenarioIds - Optional list of failure scenario IDs to apply
 */
export async function ensureOtelDemo({
  log,
  signal,
  demoType = 'otel-demo',
  configPath,
  logsIndex = 'logs',
  version,
  teardown = false,
  scenarioIds = [],
}: {
  log: ToolingLog;
  signal: AbortSignal;
  demoType?: DemoType;
  configPath?: string | undefined;
  logsIndex?: string;
  version?: string;
  teardown?: boolean;
  scenarioIds?: string[];
}) {
  await assertKubectlAvailable();
  await assertMinikubeAvailable();

  // Get demo configuration
  const demoConfig = getDemoConfig(demoType);
  const demoVersion = version || demoConfig.defaultVersion;
  const namespace = demoConfig.namespace;
  const manifestsFilePath = Path.join(DATA_DIR, `${demoType}.yaml`);

  if (teardown) {
    await down(log, namespace, demoConfig.displayName);
    log.success(`${demoConfig.displayName} stopped and removed from Kubernetes`);
    return;
  }

  log.info(`Starting ${demoConfig.displayName} on Kubernetes (minikube)...`);
  log.info(`  Version: ${demoVersion}`);

  // Ensure minikube is running
  log.info('Ensuring minikube is running...');
  await ensureMinikubeRunning();

  // Read Kibana configuration to get Elasticsearch and Kibana server credentials
  const kibanaConfig = readKibanaConfig(log, configPath);
  const {
    elasticsearch: elasticsearchConfig,
    server: serverConfig,
    kibanaCredentials,
  } = kibanaConfig;

  const elasticsearchHost = normalizeElasticsearchHost(elasticsearchConfig.hosts);
  const elasticsearchUsername = elasticsearchConfig.username;
  const elasticsearchPassword = elasticsearchConfig.password;

  // Build the base Kibana URL from config
  const kibanaHostname = `http://${serverConfig.host}:${serverConfig.port}${serverConfig.basePath}`;

  // Resolve the actual Kibana URL by detecting any dev mode base path
  // When running `yarn start` without `--no-base-path`, Kibana uses a random 3-letter prefix
  const kibanaUrl = await resolveKibanaUrl(kibanaHostname, log);

  log.info(`Kibana: ${kibanaUrl}`);
  log.info(`Elasticsearch: ${elasticsearchHost}`);
  log.info(`Logs index: ${logsIndex}`);

  // Enable streams in Kibana (sets up the logs index)
  // Uses Kibana credentials (defaults to elastic superuser) which has required manage_stream privilege
  await enableStreams({
    kibanaUrl,
    username: kibanaCredentials.username,
    password: kibanaCredentials.password,
    log,
  });

  // Create a data view for logs (useful for Discover and dashboards)
  await createDataView({
    kibanaUrl,
    username: kibanaCredentials.username,
    password: kibanaCredentials.password,
    log,
  });

  // Stop any existing deployment
  log.debug('Removing existing deployment');
  await down(log, namespace, demoConfig.displayName);

  // Process failure scenarios
  const activeScenarios: FailureScenario[] = [];
  const envOverrides: Record<string, Record<string, string>> = {};

  for (const id of scenarioIds) {
    const scenario = getScenarioById(demoType, id);
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
    namespace: demoConfig.namespace,
  });

  // Generate Kubernetes manifests with scenario overrides
  log.info('Generating Kubernetes manifests...');
  const manifestGenerator = getDemoManifests(demoType);
  const manifests = manifestGenerator.generate({
    config: demoConfig,
    version: demoVersion,
    elasticsearchEndpoint: elasticsearchHost,
    username: elasticsearchUsername,
    password: elasticsearchPassword,
    logsIndex,
    collectorConfigYaml: collectorConfig,
    envOverrides,
  });

  log.debug(`Writing manifests to ${manifestsFilePath}`);
  await writeFile(manifestsFilePath, manifests);

  // Apply the manifests
  log.info('Deploying to Kubernetes...');
  await execa.command(`kubectl apply -f ${manifestsFilePath}`, {
    stdio: 'inherit',
  });

  // Wait for pods to be ready
  log.info('Waiting for pods to be ready (this may take a few minutes)...');

  const waitAndReport = async () => {
    try {
      await waitForPodsReady(namespace, 300);

      const minikubeIp = await getMinikubeIp();

      log.write('');
      log.write(
        `${chalk.green('✔')} ${
          demoConfig.displayName
        } deployed successfully and connected to ${elasticsearchHost}`
      );
      log.write('');

      if (demoConfig.frontendService) {
        log.write(
          `  ${chalk.bold('Web Store:')}        http://${minikubeIp}:${
            demoConfig.frontendService.nodePort
          }`
        );
      }

      log.write(`  ${chalk.bold('Logs Index:')}       ${logsIndex}`);

      if (activeScenarios.length > 0) {
        log.write(
          `  ${chalk.bold('Active Scenarios:')} ${chalk.yellow(
            activeScenarios.map((s) => s.id).join(', ')
          )}`
        );
      }
      log.write('');

      if (demoConfig.frontendService) {
        log.write(chalk.dim('  To access the frontend, run:'));
        log.write(
          chalk.dim(
            `    minikube service ${demoConfig.frontendService.name}-external -n ${namespace}`
          )
        );
        log.write('');
      }

      log.write(chalk.dim('  To view pod logs:'));
      log.write(chalk.dim(`    kubectl logs -f -n ${namespace} -l app=frontend`));
      log.write('');
      log.write(chalk.dim('  To stop the demo:'));
      log.write(chalk.dim(`    node scripts/otel_demo.js --demo ${demoType} --teardown`));
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
      `kubectl logs -f -n ${namespace} -l app=otel-collector --max-log-requests=10`,
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
 * Patches failure scenarios onto a running demo cluster.
 * Uses kubectl set env to update deployments without full redeployment.
 *
 * @param log - Tooling logger for output
 * @param demoType - Type of demo to patch (default: 'otel-demo')
 * @param scenarioIds - List of scenario IDs to apply (empty = no changes unless reset)
 * @param reset - If true, resets all services to defaults
 */
export async function patchScenarios({
  log,
  demoType = 'otel-demo',
  scenarioIds = [],
  reset = false,
}: {
  log: ToolingLog;
  demoType?: DemoType;
  scenarioIds?: string[];
  reset?: boolean;
}) {
  await assertKubectlAvailable();

  const demoConfig = getDemoConfig(demoType);
  const namespace = demoConfig.namespace;
  const serviceDefaults = getDemoServiceDefaults(demoType);

  // Check if namespace exists
  try {
    await execa.command(`kubectl get namespace ${namespace}`);
  } catch {
    throw new Error(
      `Namespace ${namespace} not found. Run 'node scripts/otel_demo.js --demo ${demoType}' first to deploy.`
    );
  }

  if (reset) {
    log.info(`Resetting all scenarios to defaults for ${demoConfig.displayName}...`);

    // Reset all services to their default values
    for (const [service, defaults] of Object.entries(serviceDefaults)) {
      const envArgs = Object.entries(defaults)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');

      log.debug(`Resetting ${service}: ${envArgs}`);
      try {
        await execa.command(`kubectl set env deployment/${service} -n ${namespace} ${envArgs}`, {
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
    const scenario = getScenarioById(demoType, id);
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
      await execa.command(`kubectl set env deployment/${service} -n ${namespace} ${envArgs}`, {
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
  log.write(chalk.dim(`    kubectl get pods -n ${namespace} -w`));
  log.write('');
  log.write(chalk.dim('  To reset to defaults:'));
  log.write(chalk.dim(`    node scripts/otel_demo.js --demo ${demoType} --reset`));
}
