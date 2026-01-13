/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Rich Change Events
 *
 * Story: A complete deployment lifecycle and post-deployment incidents.
 *
 * Timeline (relative to 'now'):
 * - T-50m: CI/CD Pipeline 'deploy-checkout-v2' starts (Trace).
 * - T-45m: Kubernetes Deployment 'checkout-service' rolls out v2.0.0 (Logs: ScalingReplicaSet, SuccessfulCreate).
 * - T-40m: Traffic shifts from v1.5.0 to v2.0.0 (APM Traces - Service Version Change).
 * - T-30m: Configuration change: 'payment-timeout' increased (Logs: ConfigMap Sync).
 * - T-20m: Feature Flag 'enable_ai_recommendations' toggled ON (Logs: OTel Feature Flag).
 * - T-10m: Traffic spike triggers HPA scaling (Logs: HorizontalPodAutoscaler).
 *
 * This scenario tests:
 * 1. OTel CI/CD Pipeline Spans (Trace Indices)
 * 2. K8s Event Logic (Log Indices)
 * 3. Service Version Change Detection (Aggregations on Traces)
 * 4. Feature Flag & Config logic
 * 5. Scaling logic
 */

import type { ApmFields, LogDocument, Timerange } from '@kbn/synthtrace-client';
import { apm, log } from '@kbn/synthtrace-client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient, type ScenarioReturnType } from '../../../../lib/utils/with_client';
import type { LogsSynthtraceEsClient } from '../../../../lib/logs/logs_synthtrace_es_client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';

/**
 * Generates rich change events data including K8s deployments, config changes,
 * feature flags, scaling events (logs) and CI/CD pipeline traces (APM).
 * Can be used both by CLI (via default export) and by API tests (via direct import).
 */
export function generateRichChangeEventsData({
  range,
  logsEsClient,
  apmEsClient,
}: {
  range: Timerange;
  logsEsClient: LogsSynthtraceEsClient;
  apmEsClient: ApmSynthtraceEsClient;
}): [ScenarioReturnType<LogDocument>, ScenarioReturnType<ApmFields>] {
  const end = range.to.valueOf();

  // We assume a 1h window for the "rich" story
  const T_MINUS_50 = end - 50 * 60 * 1000;
  const T_MINUS_45 = end - 45 * 60 * 1000;
  const T_MINUS_40 = end - 40 * 60 * 1000;
  const T_MINUS_30 = end - 30 * 60 * 1000;
  const T_MINUS_20 = end - 20 * 60 * 1000;
  const T_MINUS_10 = end - 10 * 60 * 1000;

  // --- 1. Logs Generation ---
  const logData = range.interval('1m').generator((timestamp) => {
    const events = [];

    // K8s Deployment Rollout (v2.0.0)
    if (timestamp >= T_MINUS_45 && timestamp < T_MINUS_45 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('Scaled up replica set checkout-service-v2-0-0 to 1')
          .service('checkout-service')
          .defaults({
            'event.category': 'deployment',
            // @ts-expect-error
            'k8s.event.action': 'ScalingReplicaSet',
            'k8s.object.kind': 'Deployment',
            'k8s.object.name': 'checkout-service',
            'k8s.deployment.name': 'checkout-service',
            'service.version': '2.0.0',
            'deployment.environment.name': 'production',
            'service.environment': 'production',
          }),
        log
          .create()
          .timestamp(timestamp + 1000)
          .message('Created pod: checkout-service-v2-0-0-abcde')
          .service('checkout-service')
          .defaults({
            // @ts-expect-error
            'k8s.event.reason': 'SuccessfulCreate',
            'k8s.object.kind': 'ReplicaSet',
            'k8s.object.name': 'checkout-service-v2',
            'deployment.environment.name': 'production',
          })
      );
    }

    // Configuration Change (ConfigMap Sync)
    if (timestamp >= T_MINUS_30 && timestamp < T_MINUS_30 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('Configuration synced successfully')
          .service('checkout-service')
          .defaults({
            'event.category': 'configuration',
            // @ts-expect-error
            'k8s.event.reason': 'Sync',
            'k8s.object.kind': 'ConfigMap',
            'k8s.object.name': 'checkout-config',
            'deployment.environment.name': 'production',
            message: 'Configuration update: payment-timeout set to 5000ms',
          })
      );
    }

    // Feature Flag Toggle (OTel SemConv)
    if (timestamp >= T_MINUS_20 && timestamp < T_MINUS_20 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('Feature flag evaluated')
          .service('checkout-service')
          .defaults({
            // @ts-expect-error
            'event.name': 'feature_flag.evaluation',
            'feature_flag.key': 'enable_ai_recommendations',
            'feature_flag.variant': 'on',
            'feature_flag.provider.name': 'flag-provider-x',
            'service.name': 'checkout-service',
            'deployment.environment.name': 'production',
          })
      );
    }

    // Scaling Event (HPA)
    if (timestamp >= T_MINUS_10 && timestamp < T_MINUS_10 + 60000) {
      events.push(
        log
          .create()
          .timestamp(timestamp)
          .message('New size: 5; reason: cpu resource utilization (above target)')
          .service('checkout-service')
          .defaults({
            'event.action': 'scaling',
            // @ts-expect-error
            'k8s.event.reason': 'HorizontalPodAutoscaler',
            'k8s.object.kind': 'HorizontalPodAutoscaler',
            'k8s.object.name': 'checkout-hpa',
            'deployment.environment.name': 'production',
          })
      );
    }

    return events;
  });

  // --- 2. Traces Generation (CI/CD & Version Change) ---
  const service = apm
    .service('checkout-service', 'production', 'nodejs')
    .instance('checkout-instance');

  const traceData = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const docs = [];

      // CI/CD Pipeline Trace (at T-50m)
      if (timestamp >= T_MINUS_50 && timestamp < T_MINUS_50 + 60000) {
        // We manually construct a span that looks like a CI/CD run
        // Note: synthtrace apm helper creates regular transactions, we inject OTel attributes
        const pipelineSpan = service
          .transaction('deploy-checkout-v2', 'unknown') // type is less important than attributes
          .timestamp(timestamp)
          .duration(5000)
          .success()
          .defaults({
            // @ts-expect-error
            'cicd.pipeline.name': 'deploy-checkout-v2',
            'cicd.pipeline.run.id': 'run-12345',
            'cicd.pipeline.result': 'success',
            'cicd.pipeline.task.type': 'deploy', // Critical filter in tool
            'service.name': 'github-actions', // Often reported by the CI agent
          });
        docs.push(pipelineSpan);
      }

      // Regular Traffic: Version 1.5.0 (Before T-40m)
      if (timestamp < T_MINUS_40) {
        docs.push(
          service
            .transaction('POST /checkout', 'request')
            .timestamp(timestamp)
            .defaults({ 'service.version': '1.5.0' })
            .success()
        );
      }
      // Regular Traffic: Version 2.0.0 (After T-40m)
      else {
        docs.push(
          service
            .transaction('POST /checkout', 'request')
            .timestamp(timestamp)
            .defaults({ 'service.version': '2.0.0' })
            .success()
        );
      }

      return docs;
    });

  return [withClient(logsEsClient, logData), withClient(apmEsClient, traceData)];
}

export default createCliScenario(({ range, clients: { logsEsClient, apmEsClient } }) =>
  generateRichChangeEventsData({ range, logsEsClient, apmEsClient })
);
