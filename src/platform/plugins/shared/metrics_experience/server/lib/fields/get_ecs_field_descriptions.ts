/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EcsFlat } from '@elastic/ecs';

export function getEcsFieldDescriptions(fieldNames: string[]): Map<string, string> {
  const ecsMap = new Map<string, string>();

  for (const fieldName of fieldNames) {
    const cleanFieldName = fieldName
      .replaceAll('resource.attributes.', '')
      .replaceAll('attributes.', '');

    const ecsField = (EcsFlat as Record<string, { short?: string }>)[cleanFieldName];
    if (ecsField && ecsField.short) {
      ecsMap.set(fieldName, ecsField.short);
    }
  }

  return ecsMap;
}
