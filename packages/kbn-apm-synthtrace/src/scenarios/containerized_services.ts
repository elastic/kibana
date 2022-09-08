/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, ApmFields, timerange } from '../..';
import { generateShortId } from '../lib/utils/generate_id';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const kubernetesInstance = apm

        .service('service-kubernetes-orchestration', ENVIRONMENT, 'go')
        .instance('9cfb85db12fb892a5dbdd5bc1a20062a41a2ddf44606e6d05cd95dae64fe4c43');

      const kubernetesEvents = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          return kubernetesInstance
            .transaction('Transaction A')
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              kubernetesInstance
                .containerId('67906a7acd57228142607f586f927d84e7598ee85d3638252829c8ce5a8bcbea')
                .podId(generateShortId())
                .span('custom_operation_b', 'custom')
                .duration(1000)
                .failure()
                .timestamp(timestamp)
            );
        });

      const kubernetesMetricsets = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          kubernetesInstance
            .appMetrics({
              'container.id': '9cfb85db12fb892a5dbdd5bc1a20062a41a2ddf44606e6d05cd95dae64fe4c43',
              'system.memory.actual.free': 800,
              'system.memory.total': 1000,
              'system.cpu.total.norm.pct': 0.6,
              'system.process.cpu.total.norm.pct': 0.7,
              'kubernetes.pod.name': `pod-name-kub`,
              'kubernetes.pod.uid': 'bbdeb1f6-81f6-4fbf-af60-f83bce15fe8c',
              'kubernetes.namespace': 'kube-system',
              'kubernetes.replicaset.name': `kube-replicaset-1`,
              'kubernetes.container.name': 'kube-container-name-1',
              'kubernetes.deployment.name': 'kube-deployment-1',
            })
            .timestamp(timestamp)
        );

      const kubernetesMetricsets2 = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          kubernetesInstance
            .appMetrics({
              'container.id': '67906a7acd57228142607f586f927d84e7598ee85d3638252829c8ce5a8bcbea',
              'system.memory.actual.free': 800,
              'system.memory.total': 1000,
              'system.cpu.total.norm.pct': 0.6,
              'system.process.cpu.total.norm.pct': 0.7,
              'kubernetes.pod.name': `pod-name-kub`,
              'kubernetes.pod.uid': 'aaeb1f6-81f6-4fbf-af60-f83bce15fe8c',
              'kubernetes.namespace': 'default',
              'kubernetes.replicaset.name': `kube-replicaset-2`,
              'kubernetes.container.name': 'kube-container-name-2',
              'kubernetes.deployment.name': 'kube-deployment-2',
            })
            .timestamp(timestamp)
        );

      const dockerInstance = apm
        .service('service-docker-orchestration', ENVIRONMENT, 'go')
        .instance('b582241d34adb7e4c04fd85ee2801e0424aa257fc22432a451bc475c93d1d615');

      const dockerEvents = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => {
          return dockerInstance
            .transaction('Transaction A')
            .timestamp(timestamp)
            .duration(1000)
            .success();
        });

      const dockerMetricsets = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          dockerInstance
            .appMetrics({
              'container.id': 'b582241d34adb7e4c04fd85ee2801e0424aa257fc22432a451bc475c93d1d615',
              'system.memory.actual.free': 800,
              'system.memory.total': 1000,
              'system.cpu.total.norm.pct': 0.6,
              'system.process.cpu.total.norm.pct': 0.7,
            })
            .timestamp(timestamp)
        );

      return kubernetesEvents.merge(
        kubernetesMetricsets,
        kubernetesMetricsets2,
        dockerMetricsets,
        dockerEvents
      );
    },
  };
};

export default scenario;
