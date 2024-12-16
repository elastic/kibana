/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Schema } from '..';
import { K8sEntity } from '.';

export function k8sContainerEntity({
  schema,
  id,
  entityId,
  ...others
}: {
  schema: Schema;
  id: string;
  entityId: string;
  [key: string]: any;
}) {
  if (schema === 'ecs') {
    return new K8sEntity(schema, {
      'entity.definition_id': 'container',
      'entity.type': 'container',
      'kubernetes.container.id': id,
      'entity.id': entityId,
      ...others,
    });
  }

  return new K8sEntity(schema, {
    'entity.definition_id': 'container',
    'entity.type': 'container',
    'container.id': id,
    'entity.id': entityId,
    ...others,
  });
}
