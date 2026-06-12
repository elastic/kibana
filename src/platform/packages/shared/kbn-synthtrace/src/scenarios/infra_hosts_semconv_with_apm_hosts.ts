/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates OpenTelemetry (semconv) infrastructure host metrics combined with
 * OTel APM traces from services running on those hosts.
 */

import { apm, Serializable, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { OtelInstance, ApmOtelFields, Fields } from '@kbn/synthtrace-client';
import { random, times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { getNumberOpt } from './helpers/scenario_opts_helpers';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<Fields | ApmOtelFields> = async ({ logger, scenarioOpts }) => {
  const numInstances = getNumberOpt(scenarioOpts, 'numInstances', 10);

  return {
    generate: ({ range, clients: { infraEsClient, apmEsClient } }) => {
      // Only half of the instances will have host metrics
      const numHostInstances = Math.floor(numInstances / 2);
      const hosts = times(numHostInstances).map((index) => `semconv-host-${index}`);

      const metrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          hosts.flatMap((hostName) => {
            const base = {
              'agent.id': `agent-${hostName}`,
              'host.hostname': hostName,
              '@timestamp': timestamp,
              'host.name': hostName,
              'host.os.name': 'ubuntu',
              'cloud.provider': 'aws',
              'cloud.region': 'us-central1',
              'host.ip': '122.122.122.122',
              'resource.attributes.host.name': hostName,
              'resource.attributes.os.type': 'ubuntu',
              'os.type': 'ubuntu',
              'data_stream.dataset': 'hostmetricsreceiver.otel',
              'data_stream.type': 'metrics',
              'data_stream.namespace': 'default',
            };

            const cpuIdleUtilization = 0.3 + Math.random() * 0.4;
            const cpuWaitUtilization = Math.random() * 0.1;
            const loadAvg1m = 1 + Math.random() * 3;
            const cpuDocs = [
              { state: 'idle', 'system.cpu.utilization': cpuIdleUtilization },
              { state: 'wait', 'system.cpu.utilization': cpuWaitUtilization },
              { state: 'user', 'system.cpu.utilization': Math.random() * 0.3 },
              { state: 'system', 'system.cpu.utilization': Math.random() * 0.2 },
            ].map(({ state, ...cpuFields }) => ({
              ...base,
              state,
              ...cpuFields,
              'metrics.system.cpu.utilization': cpuFields['system.cpu.utilization'],
              'metricset.name': 'cpu',
              'system.cpu.logical.count': 4,
              'metrics.system.cpu.logical.count': 4,
              'system.cpu.load_average.1m': loadAvg1m,
              'metrics.system.cpu.load_average.1m': loadAvg1m,
            }));

            const totalMemory = 16 * 1024 * 1024 * 1024;
            const usedMemory = totalMemory * (0.4 + Math.random() * 0.3);
            const freeMemory = totalMemory - usedMemory;
            const memDocs = [
              {
                state: 'used',
                'system.memory.utilization': usedMemory / totalMemory,
                'system.memory.usage': usedMemory,
              },
              {
                state: 'free',
                'system.memory.utilization': freeMemory / totalMemory,
                'system.memory.usage': freeMemory,
              },
              {
                state: 'cached',
                'system.memory.utilization': 0.1,
                'system.memory.usage': totalMemory * 0.1,
              },
              {
                state: 'buffered',
                'system.memory.utilization': 0.05,
                'system.memory.usage': totalMemory * 0.05,
              },
              {
                state: 'slab_reclaimable',
                'system.memory.utilization': 0.02,
                'system.memory.usage': totalMemory * 0.02,
              },
              {
                state: 'slab_unreclaimable',
                'system.memory.utilization': 0.01,
                'system.memory.usage': totalMemory * 0.01,
              },
            ].map(({ state, ...memFields }) => ({
              ...base,
              state,
              ...memFields,
              'metrics.system.memory.utilization': memFields['system.memory.utilization'],
              'metrics.system.memory.usage': memFields['system.memory.usage'],
              'metricset.name': 'memory',
            }));

            const totalDisk = 100 * 1024 * 1024 * 1024; // 100GB
            const usedPct = 0.3 + Math.random() * 0.4;
            const usedDisk = totalDisk * usedPct;
            const freeDisk = totalDisk - usedDisk;
            const diskDocs = [
              { state: 'used', 'metrics.system.filesystem.usage': usedDisk },
              { state: 'free', 'metrics.system.filesystem.usage': freeDisk },
            ].map((disk) => ({
              ...base,
              ...disk,
              'system.filesystem.usage': disk['metrics.system.filesystem.usage'],
              'metricset.name': 'filesystem',
            }));

            const networkDocs = [
              {
                direction: 'transmit',
                'system.network.io': Math.floor(Math.random() * 1000000000),
              },
              {
                direction: 'receive',
                'system.network.io': Math.floor(Math.random() * 1000000000),
              },
            ].map(({ 'system.network.io': netIo, ...net }) => ({
              ...base,
              ...net,
              'system.network.io': netIo,
              'metrics.system.network.io': netIo,
              'metricset.name': 'network',
              'device.keyword': 'eth0',
            }));

            return [...cpuDocs, ...memDocs, ...diskDocs, ...networkDocs].map(
              (doc) => new Serializable(doc)
            );
          })
        );

      const transactionName = 'GET /api/host/{id}';

      // APM OTel traces — all instances, some without host metrics
      const otelInstances = times(numInstances).map((index) =>
        apm
          .otelService({
            name: `synth-otel-svc-${index}`,
            namespace: ENVIRONMENT,
            sdkLanguage: 'java',
            sdkName: 'opentelemetry',
            distro: 'elastic',
          })
          .instance(`semconv-host-${index}`)
      );

      const instanceSpans = (instance: OtelInstance) => {
        const throughput = random(1, 10);
        const hasHighDuration = Math.random() > 0.5;

        return range.ratePerMinute(throughput).generator((timestamp) => {
          const duration = hasHighDuration ? random(1000, 5000) : random(100, 1000);
          return instance
            .span({ name: transactionName, kind: 'Server' })
            .timestamp(timestamp)
            .duration(duration)
            .success();
        });
      };

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_semconv_hosts', () => metrics)
        ),
        withClient(
          apmEsClient,
          logger.perf('generating_otel_apm_events', () =>
            otelInstances.flatMap((instance) => instanceSpans(instance))
          )
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
