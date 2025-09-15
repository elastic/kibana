/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Attributes } from '@opentelemetry/api';
import { isArray, isPlainObject } from 'lodash';

/**
 * Flattens a structured object in a way that is consistent with
 * how OpenTelemetry defines {@link Attributes}
 */
export function flattenToAttributes(obj: Record<string, any>, parentKey: string = ''): Attributes {
  const result: Attributes = {};

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (isPlainObject(value) || isArray(value)) {
        Object.assign(result, flattenToAttributes(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}
