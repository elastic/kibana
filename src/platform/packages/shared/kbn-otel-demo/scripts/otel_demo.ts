/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import chalk from 'chalk';
import { ensureOtelDemo, patchScenarios } from '../src/ensure_otel_demo';
import type { DemoType } from '../src/types';
import {
  listAvailableDemos,
  getDemoConfig,
  getDemoScenarios,
  getScenarioById,
} from '../src/demo_registry';
import {
  installChaosMesh,
  isChaosMeshInstalled,
  createChaosScenarios,
  getChaosScenarioById,
  applyScenario as applyChaosScenario,
  deleteScenario as deleteChaosScenario,
  deleteAllExperiments,
  listActiveExperiments,
} from '../src/chaos_mesh';

run(
  async ({ log, addCleanupTask, flags }) => {
    const demoType = (flags.demo as DemoType | undefined) || 'otel-demo';

    // Validate demo type
    const availableDemos = listAvailableDemos();
    if (!availableDemos.includes(demoType)) {
      throw new Error(
        `Unknown demo type: ${demoType}. Available: ${availableDemos.join(
          ', '
        )}\nUse --list-demos to see details.`
      );
    }

    const demoConfig = getDemoConfig(demoType);
    const demoScenarios = getDemoScenarios(demoType);

    // Handle --list-demos
    if (flags['list-demos']) {
      log.info('Available demo environments:');
      log.info('');
      for (const type of availableDemos) {
        const config = getDemoConfig(type);
        log.info(`  ${type.padEnd(20)} - ${config.displayName}`);
        log.info(`    ${chalk.dim(config.description)}`);
        log.info(`    ${chalk.dim('Versions: ' + config.availableVersions.join(', '))}`);
        log.info('');
      }
      return Promise.resolve();
    }

    // Handle --list-scenarios
    if (flags['list-scenarios']) {
      log.info(`Failure scenarios for ${demoConfig.displayName}:`);
      log.info('');
      log.info('DRAMATIC (service-breaking):');
      demoScenarios
        .filter((s) => s.category === 'dramatic')
        .forEach((s) => {
          log.info(`  ${s.id.padEnd(35)} - ${s.name}`);
        });
      log.info('');
      log.info('SUBTLE (degraded performance/observability):');
      demoScenarios
        .filter((s) => s.category === 'subtle')
        .forEach((s) => {
          log.info(`  ${s.id.padEnd(35)} - ${s.name}`);
        });
      return Promise.resolve();
    }

    // Handle --list-chaos
    if (flags['list-chaos']) {
      const chaosScenarios = createChaosScenarios(demoConfig.namespace);
      log.info(`Chaos Mesh scenarios for ${demoConfig.displayName}:`);
      log.info('');
      log.info('POD CHAOS:');
      chaosScenarios
        .filter((s) => s.experiments.some((e) => e.category === 'pod'))
        .forEach((s) => {
          log.info(`  ${s.id.padEnd(25)} - ${s.name}`);
          log.info(`    ${chalk.dim(s.description)}`);
        });
      log.info('');
      log.info('NETWORK CHAOS:');
      chaosScenarios
        .filter((s) => s.experiments.some((e) => e.category === 'network'))
        .forEach((s) => {
          log.info(`  ${s.id.padEnd(25)} - ${s.name}`);
          log.info(`    ${chalk.dim(s.description)}`);
        });
      log.info('');
      log.info('STRESS CHAOS:');
      chaosScenarios
        .filter((s) => s.experiments.some((e) => e.category === 'stress'))
        .forEach((s) => {
          log.info(`  ${s.id.padEnd(25)} - ${s.name}`);
          log.info(`    ${chalk.dim(s.description)}`);
        });
      log.info('');
      log.info('IO CHAOS:');
      chaosScenarios
        .filter((s) => s.experiments.some((e) => e.category === 'io'))
        .forEach((s) => {
          log.info(`  ${s.id.padEnd(25)} - ${s.name}`);
          log.info(`    ${chalk.dim(s.description)}`);
        });
      log.info('');
      log.info('HTTP CHAOS:');
      chaosScenarios
        .filter((s) => s.experiments.some((e) => e.category === 'http'))
        .forEach((s) => {
          log.info(`  ${s.id.padEnd(25)} - ${s.name}`);
          log.info(`    ${chalk.dim(s.description)}`);
        });
      log.info('');
      log.info(chalk.dim('Note: Chaos Mesh must be installed. Use --install-chaos to install.'));
      return Promise.resolve();
    }

    // Handle --install-chaos
    if (flags['install-chaos']) {
      return installChaosMesh(log);
    }

    // Handle --chaos-status
    if (flags['chaos-status']) {
      const installed = await isChaosMeshInstalled();
      if (!installed) {
        log.warning('Chaos Mesh is not installed. Use --install-chaos to install.');
        return Promise.resolve();
      }
      log.info('Chaos Mesh is installed.');
      log.info('');
      log.info(`Active chaos experiments in namespace ${demoConfig.namespace}:`);
      const active = await listActiveExperiments(demoConfig.namespace);
      if (active.length === 0) {
        log.info('  No active experiments');
      } else {
        active.forEach((exp) => log.info(`  ${exp}`));
      }
      return Promise.resolve();
    }

    // Handle --clear-chaos
    if (flags['clear-chaos']) {
      return deleteAllExperiments(log, demoConfig.namespace);
    }

    const controller = new AbortController();

    addCleanupTask(() => {
      controller.abort();
    });

    const configPath = flags.config ? String(flags.config) : undefined;
    const logsIndex = flags['logs-index'] ? String(flags['logs-index']) : 'logs.otel';
    const version = flags.version ? String(flags.version) : undefined;
    const teardown = Boolean(flags.teardown);
    const patch = Boolean(flags.patch);
    const reset = Boolean(flags.reset);
    const forceRebuildImages = Boolean(flags['rebuild-images']);

    // Parse scenario flags
    const scenarioIds: string[] = [];
    if (flags.scenario) {
      const scenarios = Array.isArray(flags.scenario) ? flags.scenario : [flags.scenario];
      for (const id of scenarios) {
        const scenario = getScenarioById(demoType, String(id));
        if (!scenario) {
          throw new Error(
            `Unknown scenario: ${id}. Use --list-scenarios to see available scenarios for ${demoType}.`
          );
        }
        scenarioIds.push(String(id));
      }
    }

    // Parse chaos scenario flags
    const chaosScenarioIds: string[] = [];
    if (flags.chaos) {
      const chaosFlags = Array.isArray(flags.chaos) ? flags.chaos : [flags.chaos];
      for (const id of chaosFlags) {
        const scenario = getChaosScenarioById(demoConfig.namespace, String(id));
        if (!scenario) {
          throw new Error(
            `Unknown chaos scenario: ${id}. Use --list-chaos to see available chaos scenarios.`
          );
        }
        chaosScenarioIds.push(String(id));
      }
    }

    // Handle --apply-chaos (apply chaos scenarios to running cluster)
    if (flags['apply-chaos'] && chaosScenarioIds.length > 0) {
      const installed = await isChaosMeshInstalled();
      if (!installed) {
        throw new Error('Chaos Mesh is not installed. Use --install-chaos to install first.');
      }

      for (const id of chaosScenarioIds) {
        const scenario = getChaosScenarioById(demoConfig.namespace, id);
        if (scenario) {
          await applyChaosScenario(log, scenario);
        }
      }
      return Promise.resolve();
    }

    // Handle --remove-chaos (remove specific chaos scenarios)
    if (flags['remove-chaos'] && chaosScenarioIds.length > 0) {
      for (const id of chaosScenarioIds) {
        const scenario = getChaosScenarioById(demoConfig.namespace, id);
        if (scenario) {
          await deleteChaosScenario(log, scenario);
        }
      }
      return Promise.resolve();
    }

    // Handle --patch or --reset (apply/remove scenarios on running cluster)
    if (patch || reset) {
      return patchScenarios({
        log,
        demoType,
        scenarioIds: reset ? [] : scenarioIds,
        reset,
      }).catch((error) => {
        throw new Error('Failed to patch scenarios', { cause: error });
      });
    }

    return ensureOtelDemo({
      log,
      signal: controller.signal,
      demoType,
      configPath,
      logsIndex,
      version,
      teardown,
      scenarioIds,
      forceRebuildImages,
    }).catch((error) => {
      throw new Error(`Failed to manage ${demoConfig.displayName}`, { cause: error });
    });
  },
  {
    description: `
      Deploy demo microservices applications to Kubernetes (minikube) with logs
      automatically collected and sent to Elasticsearch via OpenTelemetry Collector.
      
      Supports multiple demo environments:
        - otel-demo: OpenTelemetry Demo (default)
        - online-boutique: Google Online Boutique
        - bank-of-anthos: Google Bank of Anthos
        - quarkus-super-heroes: Quarkus Super Heroes
        - aws-retail-store: AWS Retail Store Sample
        - kubepay: KubePay Spring Microservices
        - rust-k8s-demo: Rust K8s Demo
      
      Reads Elasticsearch connection details from kibana.dev.yml and supports
      failure scenario injection and Chaos Mesh experiments for testing observability.
    `,
    flags: {
      string: ['config', 'logs-index', 'scenario', 'demo', 'version', 'chaos'],
      boolean: [
        'teardown',
        'list-demos',
        'list-scenarios',
        'patch',
        'reset',
        'list-chaos',
        'install-chaos',
        'chaos-status',
        'clear-chaos',
        'apply-chaos',
        'remove-chaos',
        'rebuild-images',
      ],
      alias: {
        c: 'config',
        s: 'scenario',
        p: 'patch',
        r: 'reset',
        d: 'demo',
        v: 'version',
      },
      default: {
        demo: 'otel-demo',
        'logs-index': 'logs.otel',
      },
      help: `
        --demo, -d         Demo environment to run (otel-demo, online-boutique, bank-of-anthos, etc.)
        --version, -v      Demo version (defaults to demo's defaultVersion)
        --config, -c       Path to Kibana config file (defaults to config/kibana.dev.yml)
        --logs-index       Index name for logs (defaults to "logs.otel")
        --list-demos       List all available demo environments
        --list-scenarios   List failure scenarios for selected demo
        --scenario, -s     Apply a failure scenario (can be repeated for multiple scenarios)
        --patch, -p        Patch scenarios onto running cluster (no redeploy)
        --reset, -r        Reset all scenarios to defaults (no redeploy)
        --teardown         Stop and remove demo deployment
        --rebuild-images   Force rebuild of custom images (for demos that require building from source)

        Chaos Mesh Options:
        --list-chaos       List available Chaos Mesh scenarios
        --install-chaos    Install Chaos Mesh CRDs and controller to cluster
        --chaos-status     Show Chaos Mesh installation status and active experiments
        --chaos            Specify a chaos scenario (can be repeated)
        --apply-chaos      Apply specified chaos scenarios to running cluster
        --remove-chaos     Remove specified chaos scenarios from cluster
        --clear-chaos      Remove all chaos experiments from demo namespace
      `,
    },
  }
);
