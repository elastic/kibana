/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AsCodeDurationFormat,
  AsCodeFieldFormat,
  AsCodeHistogramFormat,
  AsCodeColorFormat,
} from '@kbn/as-code-data-views-schema';
import { camelCase, isPlainObject, snakeCase } from 'lodash';

export function isColorFormat(format: AsCodeFieldFormat): format is AsCodeColorFormat {
  return format.type === 'color';
}

export function isDurationFormat(format: AsCodeFieldFormat): format is AsCodeDurationFormat {
  return format.type === 'duration';
}

export function isHistogramFormat(format: AsCodeFieldFormat): format is AsCodeHistogramFormat {
  return format.type === 'histogram';
}

export function snakeCaseKeys(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (isPlainObject(value)) {
        return [snakeCase(key), snakeCaseKeys(value)];
      }
      return [snakeCase(key), value];
    })
  );
}

export function camelCaseKeys(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (isPlainObject(value)) {
        return [camelCase(key), camelCaseKeys(value)];
      }
      return [camelCase(key), value];
    })
  );
}
