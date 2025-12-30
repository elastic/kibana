/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { ensureOtelDemo, patchScenarios } from '../src/ensure_otel_demo';
import { FAILURE_SCENARIOS, getScenarioById } from '../src/failure_scenarios';

run(
  ({ log, addCleanupTask, flags }) => {
    // Handle --list-scenarios
    if (flags['list-scenarios']) {
      log.info('Available failure scenarios:');
      log.info('');
      log.info('DRAMATIC (service-breaking):');
      FAILURE_SCENARIOS.filter((s) => s.category === 'dramatic').forEach((s) => {
        log.info(`  ${s.id.padEnd(30)} - ${s.name}`);
      });
      log.info('');
      log.info('SUBTLE (degraded performance/observability):');
      FAILURE_SCENARIOS.filter((s) => s.category === 'subtle').forEach((s) => {
        log.info(`  ${s.id.padEnd(30)} - ${s.name}`);
      });
      return Promise.resolve();
    }

    const controller = new AbortController();

    addCleanupTask(() => {
      controller.abort();
    });

    const configPath = flags.config ? String(flags.config) : undefined;
    const logsIndex = flags['logs-index'] ? String(flags['logs-index']) : 'logs';
    const teardown = Boolean(flags.teardown);
    const patch = Boolean(flags.patch);
    const reset = Boolean(flags.reset);

    // Parse scenario flags
    const scenarioIds: string[] = [];
    if (flags.scenario) {
      const scenarios = Array.isArray(flags.scenario) ? flags.scenario : [flags.scenario];
      for (const id of scenarios) {
        const scenario = getScenarioById(String(id));
        if (!scenario) {
          throw new Error(
            `Unknown scenario: ${id}. Use --list-scenarios to see available scenarios.`
          );
        }
        scenarioIds.push(String(id));
      }
    }

    // Handle --patch or --reset (apply/remove scenarios on running cluster)
    if (patch || reset) {
      return patchScenarios({
        log,
        scenarioIds: reset ? [] : scenarioIds,
        reset,
      }).catch((error) => {
        throw new Error('Failed to patch scenarios', { cause: error });
      });
    }

    return ensureOtelDemo({
      log,
      signal: controller.signal,
      configPath,
      logsIndex,
      teardown,
      scenarioIds,
    }).catch((error) => {
      throw new Error('Failed to manage OTel Demo', { cause: error });
    });
  },
  {
    description: `
      Start the OpenTelemetry Demo application using Minikube and configure it to send
      telemetry data (logs, traces, metrics) to your local Elasticsearch instance.
      
      Reads Elasticsearch connection details from kibana.dev.yml, generates OpenTelemetry 
      Collector configuration with elasticsearchexporter, and deploys the OTel Demo to Kubernetes.
      
      Supports failure scenarios to simulate real-world misconfigurations and failures.
    `,
    flags: {
      string: ['config', 'logs-index', 'scenario'],
      boolean: ['teardown', 'list-scenarios', 'patch', 'reset'],
      alias: {
        c: 'config',
        s: 'scenario',
        p: 'patch',
        r: 'reset',
      },
      default: {
        'logs-index': 'logs',
      },
      help: `
        --config, -c       Path to Kibana config file (defaults to config/kibana.dev.yml)
        --logs-index       Index name for logs (defaults to "logs")
        --teardown         Stop and remove OTel Demo deployment
        --scenario, -s     Apply a failure scenario (can be repeated for multiple scenarios)
        --patch, -p        Patch scenarios onto running cluster (no redeploy)
        --reset, -r        Reset all scenarios to defaults (no redeploy)
        --list-scenarios   List all available failure scenarios
      `,
    },
  }
);
