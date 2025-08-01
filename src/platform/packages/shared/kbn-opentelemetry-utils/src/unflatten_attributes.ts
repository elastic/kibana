/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { AttributeValue } from '@opentelemetry/api';

/**
 * Unflattens attributes, according to the flattening heuristic
 * in flattenToAttributes.
 */

export function unflattenAttributes(
  flat: Record<string, AttributeValue | undefined>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in flat) {
    if (Object.hasOwn(flat, key)) {
      // split on dot; numeric segments cause array creation
      set(result, key.split('.'), flat[key]);
    }
  }

  return result;
}
