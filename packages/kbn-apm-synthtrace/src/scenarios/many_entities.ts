/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EntityFields, entities, generateShortId } from '@kbn/apm-synthtrace-client';
import { Schema } from '@kbn/apm-synthtrace-client/src/lib/entities';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const CLUSTER_NAME = 'cluster_foo';

const CLUSTER_ENTITY_ID = generateShortId();
const POD_ENTITY_ID = generateShortId();
const POD_UID = generateShortId();
const REPLICA_SET_ENTITY_ID = generateShortId();
const REPLICA_SET_UID = generateShortId();
const DEPLOYMENT_ENTITY_ID = generateShortId();
const DEPLOYMENT_UID = generateShortId();
const STATEFUL_SET_ENTITY_ID = generateShortId();
const STATEFUL_SET_UID = generateShortId();
const DAEMON_SET_ENTITY_ID = generateShortId();
const DAEMON_SET_UID = generateShortId();
const JOB_SET_ENTITY_ID = generateShortId();
const JOB_SET_UID = generateShortId();
const CRON_JOB_ENTITY_ID = generateShortId();
const CRON_JOB_UID = generateShortId();
const NODE_ENTITY_ID = generateShortId();
const NODE_UID = generateShortId();
const SYNTH_JAVA_TRACE_ENTITY_ID = generateShortId();
const SYNTH_HOST_FOO_LOGS_ENTITY_ID = generateShortId();
const SYNTH_CONTAINER_FOO_LOGS_ENTITY_ID = generateShortId();

const scenario: Scenario<Partial<EntityFields>> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    bootstrap: async ({ entitiesKibanaClient }) => {
      await entitiesKibanaClient.installEntityIndexPatterns();
    },
    generate: ({ range, clients: { entitiesEsClient } }) => {
      const rangeInterval = range.interval('1m').rate(1);
      const getK8sEntitiesEvents = (schema: Schema) =>
        rangeInterval.generator((timestamp) => {
          return [
            entities.k8s
              .k8sClusterJobEntity({
                schema,
                name: CLUSTER_NAME,
                entityId: CLUSTER_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sPodEntity({
                schema,
                clusterName: CLUSTER_NAME,
                name: 'pod_foo',
                uid: POD_UID,
                entityId: POD_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sReplicaSetEntity({
                clusterName: CLUSTER_NAME,
                name: 'replica_set_foo',
                schema,
                uid: REPLICA_SET_UID,
                entityId: REPLICA_SET_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sDeploymentEntity({
                clusterName: CLUSTER_NAME,
                name: 'deployment_foo',
                schema,
                uid: DEPLOYMENT_UID,
                entityId: DEPLOYMENT_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sStatefulSetEntity({
                clusterName: CLUSTER_NAME,
                name: 'stateful_set_foo',
                schema,
                uid: STATEFUL_SET_UID,
                entityId: STATEFUL_SET_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sDaemonSetEntity({
                clusterName: CLUSTER_NAME,
                name: 'daemon_set_foo',
                schema,
                uid: DAEMON_SET_UID,
                entityId: DAEMON_SET_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sJobSetEntity({
                clusterName: CLUSTER_NAME,
                name: 'job_set_foo',
                schema,
                uid: JOB_SET_UID,
                entityId: JOB_SET_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sCronJobEntity({
                clusterName: CLUSTER_NAME,
                name: 'cron_job_foo',
                schema,
                uid: CRON_JOB_UID,
                entityId: CRON_JOB_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sNodeEntity({
                clusterName: CLUSTER_NAME,
                name: 'node_job_foo',
                schema,
                uid: NODE_UID,
                entityId: NODE_ENTITY_ID,
              })
              .timestamp(timestamp),
            entities.k8s
              .k8sContainerEntity({
                id: '123',
                schema,
                entityId: NODE_ENTITY_ID,
              })
              .timestamp(timestamp),
          ];
        });

      const ecsEntities = getK8sEntitiesEvents('ecs');
      const otelEntities = getK8sEntitiesEvents('semconv');
      const synthJavaTraces = entities.serviceEntity({
        serviceName: 'synth_java',
        agentName: ['java'],
        dataStreamType: ['traces'],
        environment: 'production',
        entityId: SYNTH_JAVA_TRACE_ENTITY_ID,
      });
      const synthHostFooLogs = entities.hostEntity({
        hostName: 'synth_host_foo',
        agentName: ['macbook'],
        dataStreamType: ['logs'],
        entityId: SYNTH_HOST_FOO_LOGS_ENTITY_ID,
      });
      const synthContainerFooLogs = entities.containerEntity({
        containerId: 'synth_container_foo',
        agentName: ['macbook'],
        dataStreamType: ['logs'],
        entityId: SYNTH_CONTAINER_FOO_LOGS_ENTITY_ID,
      });

      const otherEvents = rangeInterval.generator((timestamp) => [
        synthJavaTraces.timestamp(timestamp),
        synthHostFooLogs.timestamp(timestamp),
        synthContainerFooLogs.timestamp(timestamp),
      ]);

      return [
        withClient(
          entitiesEsClient,
          logger.perf('generating_entities_k8s_ecs_events', () => ecsEntities)
        ),
        withClient(
          entitiesEsClient,
          logger.perf('generating_entities_k8s_otel_events', () => otelEntities)
        ),
        withClient(
          entitiesEsClient,
          logger.perf('generating_entities_other_events', () => otherEvents)
        ),
      ];
    },
  };
};

export default scenario;
