/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import type { DataTableRecord } from '../types';

export function getFlattenedFields<T>(doc: DataTableRecord, fields: Array<keyof T>): T {
  const formatField = <K extends keyof T>(field: K) =>
    castArray(doc.flattened[field as string])[0] as T[K];

  return fields.reduce((acc, field) => {
    acc[field] = formatField(field) as string | number | undefined;
    return acc;
  }, {} as { [ket in keyof T]?: string | number }) as T;
}
