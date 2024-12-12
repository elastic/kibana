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

const identityFieldsMap: Record<Schema, Record<string, string[]>> = {
  ecs: {
    pod: ['kubernetes.pod.uid'],
    cluster: ['orchestrator.cluster.name'],
    cronjob: ['kubernetes.cronjob.name'],
    daemonset: ['kubernetes.daemonset.name'],
    deployment: ['kubernetes.deployment.name'],
    job: ['kubernetes.job.name'],
    node: ['kubernetes.node.name'],
    replicaset: ['kubernetes.replicaset.name'],
    statefulset: ['kubernetes.statefulset.name'],
    service: ['kubernetes.service.name'],
    container: ['kubernetes.container.id'],
  },
  otel: {
    pod: ['k8s.pod.uid'],
    cluster: ['k8s.cluster.uid'],
    cronjob: ['k8s.cronjob.uid'],
    daemonset: ['k8s.daemonset.uid'],
    deployment: ['k8s.deployment.uid'],
    job: ['k8s.job.uid'],
    node: ['k8s.node.uid'],
    replicaset: ['k8s.replicaset.uid'],
    statefulset: ['k8s.statefulset.uid'],
    container: ['container.id'],
  },
};

export class K8sEntity extends Serializable<EntityFields> {
  constructor(schema: Schema, fields: EntityFields) {
    const entityType = fields['entity.type'];
    if (entityType === undefined) {
      throw new Error(`Entity type not defined`);
    }

    const entityDefinitionId = fields['entity.definition_id'];
    if (entityDefinitionId === undefined) {
      throw new Error(`Entity definition id not defined`);
    }

    const entityDefinitionWithSchema = `kubernetes_${entityDefinitionId}_${
      schema === 'ecs' ? schema : 'semconv'
    }`;
    const identityFields = identityFieldsMap[schema][entityType];
    if (identityFields === undefined || identityFields.length === 0) {
      throw new Error(
        `Identity fields not defined for schema: ${schema} and entity type: ${entityType}`
      );
    }

    super({
      ...fields,
      'entity.type': `k8s.${entityType}.${schema}`,
      'entity.definition_id': `builtin_${entityDefinitionWithSchema}`,
      'entity.identity_fields': identityFields,
      'entity.display_name': getDisplayName({ identityFields, fields }),
      'entity.definition_version': '1.0.0',
      'entity.schema_version': '1.0',
    });
  }
}

function getDisplayName({
  identityFields,
  fields,
}: {
  identityFields: string[];
  fields: EntityFields;
}) {
  return identityFields
    .map((field) => fields[field])
    .filter((_) => _)
    .join(':');
}
