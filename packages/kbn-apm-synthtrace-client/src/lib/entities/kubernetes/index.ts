/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntityFields, Schema } from '..';
import { Serializable } from '../../serializable';

const identityFieldsMap: Record<Schema, Record<K8sEntityType, string[]>> = {
  ecs: {
    pod: ['kubernetes.pod.name'],
    cluster: ['orchestrator.cluster.name'],
    cron_job: ['kubernetes.cronjob.name'],
    daemon_set: ['kubernetes.daemonset.name'],
    deployment: ['kubernetes.deployment.name'],
    job: ['kubernetes.job.name'],
    node: ['kubernetes.node.name'],
    replica_set: ['kubernetes.replicaset.name'],
    stateful_set: ['kubernetes.statefulset.name'],
    container: ['kubernetes.container.id'],
  },
  semconv: {
    pod: ['k8s.pod.name'],
    cluster: ['k8s.cluster.uid'],
    cron_job: ['k8s.cronjob.name'],
    daemon_set: ['k8s.daemonset.name'],
    deployment: ['k8s.deployment.name'],
    job: ['k8s.job.name'],
    node: ['k8s.node.uid'],
    replica_set: ['k8s.replicaset.name'],
    stateful_set: ['k8s.statefulset.name'],
    container: ['container.id'],
  },
};

type K8sEntityType =
  | 'stateful_set'
  | 'replica_set'
  | 'pod'
  | 'node'
  | 'job'
  | 'deployment'
  | 'daemon_set'
  | 'cron_job'
  | 'cluster'
  | 'container';

export class K8sEntity extends Serializable<EntityFields> {
  constructor(schema: Schema, fields: EntityFields) {
    const entityType = fields['entity.type'] as K8sEntityType;
    const entityTypeWithSchema = `kubernetes_${entityType}_${schema}`;
    super({
      ...fields,
      'entity.type': entityTypeWithSchema,
      'entity.definitionId': `builtin_${entityTypeWithSchema}`,
      'entity.displayName': getDisplayName({ schema, entityType, fields }),
    });
  }
}

function getDisplayName({
  schema,
  entityType,
  fields,
}: {
  schema: Schema;
  entityType: K8sEntityType;
  fields: EntityFields;
}) {
  const identityFields = identityFieldsMap[schema][entityType];
  if (identityFields === undefined) {
    throw new Error(
      `Identity fields not defined for schema: ${schema} and entity type: ${entityType}`
    );
  }

  return identityFields
    .map((field) => fields[field])
    .filter((_) => _)
    .join(':');
}
