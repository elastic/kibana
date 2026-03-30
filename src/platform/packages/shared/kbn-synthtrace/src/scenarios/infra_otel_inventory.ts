/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates OTel-compatible infrastructure metrics for hosts, containers, and pods.
 * Used to validate Infrastructure Inventory with OpenTelemetry schema.
 *
 * Related:
 * - https://github.com/elastic/kibana/issues/259616
 *
 * Data shape:
 * - Hosts: data_stream.dataset=hostmetricsreceiver.otel, NO container.id field
 * - Containers: data_stream.dataset=kubeletstatsreceiver.otel, WITH container.id
 * - Pods: data_stream.dataset=kubeletstatsreceiver.otel, WITH kubernetes.pod.uid
 * - Mixed (k3d-style): data_stream.dataset=hostmetricsreceiver.otel, WITH container.id
 *
 * Run:
 *   node scripts/synthtrace infra_otel_inventory --from now-1d --to now
 *
 * Scenario options:
 * - numHosts (number, default: 3): bare-metal hosts (no container.id)
 * - numK3dNodes (number, default: 2): k3d-style nodes (host metrics WITH container.id)
 * - numContainers (number, default: 4): containers from kubeletstatsreceiver
 * - numPods (number, default: 5): pods from kubeletstatsreceiver
 *
 * Validation:
 * - Hosts view (OTel schema): should show numHosts hosts, NOT numK3dNodes
 * - Containers view (OTel schema): should show numContainers containers
 * - Pods view (OTel schema): should show numPods pods
 */

import type { InfraDocument, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { Serializable } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { getNumberOpt } from './helpers/scenario_opts_helpers';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<import('@kbn/synthtrace-client').Fields> = async ({ scenarioOpts }) => {
  const numHosts = getNumberOpt(scenarioOpts, 'numHosts', 3);
  const numK3dNodes = getNumberOpt(scenarioOpts, 'numK3dNodes', 2);
  const numContainers = getNumberOpt(scenarioOpts, 'numContainers', 4);
  const numPods = getNumberOpt(scenarioOpts, 'numPods', 5);

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const metrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          const docs: Array<Serializable<Record<string, unknown>>> = [];

          const hostBase = (hostName: string) => ({
            '@timestamp': timestamp,
            'host.name': hostName,
            'host.hostname': hostName,
            'host.os.name': 'linux',
            'host.ip': '10.0.0.1',
            'cloud.provider': 'aws',
            'cloud.region': 'us-east-1',
            'resource.attributes.host.name': hostName,
            'resource.attributes.os.type': 'linux',
            'data_stream.dataset': 'hostmetricsreceiver.otel',
            'data_stream.type': 'metrics',
            'data_stream.namespace': 'default',
          });

          // Bare-metal hosts (NO container.id — should appear as hosts)
          times(numHosts).forEach((i) => {
            const name = `otel-host-${i}`;
            const base = hostBase(name);
            docs.push(
              new Serializable({
                ...base,
                'metricset.name': 'cpu',
                state: 'idle',
                'system.cpu.utilization': 0.3 + Math.random() * 0.4,
                'system.cpu.logical.count': 4,
                'system.cpu.load_average.1m': 1 + Math.random() * 3,
              })
            );
            docs.push(
              new Serializable({
                ...base,
                'metricset.name': 'memory',
                state: 'used',
                'system.memory.utilization': 0.4 + Math.random() * 0.3,
                'system.memory.usage': 8 * 1024 * 1024 * 1024,
              })
            );
          });

          // k3d-style nodes: host metrics WITH container.id (Bug 1 scenario)
          times(numK3dNodes).forEach((i) => {
            const name = `k3d-node-${i}`;
            const base = {
              ...hostBase(name),
              'container.id': `k3d-container-id-${i}`,
            };
            docs.push(
              new Serializable({
                ...base,
                'metricset.name': 'cpu',
                state: 'idle',
                'system.cpu.utilization': 0.5,
                'system.cpu.logical.count': 2,
                'system.cpu.load_average.1m': 2,
              })
            );
          });

          // Containers: kubeletstatsreceiver with container.id (Bug 2 scenario)
          times(numContainers).forEach((i) => {
            docs.push(
              new Serializable({
                '@timestamp': timestamp,
                'container.id': `otel-container-${i}`,
                'container.name': `app-container-${i}`,
                'host.name': `otel-host-${i % numHosts}`,
                'data_stream.dataset': 'kubeletstatsreceiver.otel',
                'data_stream.type': 'metrics',
                'data_stream.namespace': 'default',
                'metricset.name': 'container',
                'container.cpu.usage': Math.random() * 100000000,
                'container.memory.usage': Math.floor(Math.random() * 512 * 1024 * 1024),
              })
            );
          });

          // Pods: kubeletstatsreceiver with kubernetes.pod.uid (Bug 3 scenario)
          times(numPods).forEach((i) => {
            docs.push(
              new Serializable({
                '@timestamp': timestamp,
                'kubernetes.pod.uid': `pod-uid-${i}`,
                'kubernetes.pod.name': `app-pod-${i}`,
                'kubernetes.pod.ip': `10.244.0.${10 + i}`,
                'kubernetes.namespace': 'default',
                'host.name': `otel-host-${i % numHosts}`,
                'data_stream.dataset': 'kubeletstatsreceiver.otel',
                'data_stream.type': 'metrics',
                'data_stream.namespace': 'default',
                'metricset.name': 'pod',
                'kubernetes.pod.cpu.usage.node.pct': Math.random() * 0.5,
                'kubernetes.pod.memory.usage.bytes': Math.floor(Math.random() * 256 * 1024 * 1024),
              })
            );
          });

          return docs;
        });

      return withClient(infraEsClient, metrics as unknown as SynthtraceGenerator<InfraDocument>);
    },
  };
};

export default scenario;
