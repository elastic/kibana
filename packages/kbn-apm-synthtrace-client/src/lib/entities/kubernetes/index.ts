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
    pod: ['kubernetes.pod.name', 'kubernetes.pod.uid'],
    cluster: ['orchestrator.cluster.name'],
    cronJob: ['kubernetes.cronjob.name', 'kubernetes.cronjob.uid'],
    daemonSet: ['kubernetes.daemonset.name', 'kubernetes.daemonset.uid'],
    deployment: ['kubernetes.deployment.name', 'kubernetes.deployment.uid'],
    job: ['kubernetes.job.name', 'kubernetes.job.uid'],
    node: ['kubernetes.node.name', 'kubernetes.node.uid '],
    replicaSet: ['kubernetes.replicaset.name', 'kubernetes.replicaset.uid'],
    statefulSet: ['kubernetes.statefulset.name', 'kubernetes.statefulset.uid'],
  },
  otel: {
    pod: ['k8s.pod.name', 'k8s.pod.uid'],
    cluster: ['k8s.cluster.uid'],
    cronJob: ['k8s.cronjob.name', 'k8s.cronjob.uid'],
    daemonSet: ['k8s.daemonset.name', 'k8s.daemonset.uid'],
    deployment: ['k8s.deployment.name', 'k8s.deployment.uid'],
    job: ['k8s.job.name', 'k8s.job.uid'],
    node: ['k8s.node.uid'],
    replicaSet: ['k8s.replicaset.name', 'k8s.replicaset.uid'],
    statefulSet: ['k8s.statefulset.name', 'k8s.statefulset.uid'],
  },
};

type K8sEntityType =
  | 'statefulSet'
  | 'replicaSet'
  | 'pod'
  | 'node'
  | 'job'
  | 'deployment'
  | 'daemonSet'
  | 'cronJob'
  | 'cluster';

export class K8sEntity extends Serializable<EntityFields> {
  constructor(schema: Schema, fields: EntityFields) {
    const entityType = fields['entity.type'] as K8sEntityType;
    const entityTypeWithSchema = `${entityType}_${schema}`;
    const entityDefinitionId = `kubernetes.${entityType}.${schema}`;
    super({
      ...fields,
      'entity.type': entityTypeWithSchema,
      'entity.definitionId': `builtin_${entityDefinitionId}_from_ecs_data`,
      'entity.identityFields': identityFieldsMap[schema][entityType],
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
