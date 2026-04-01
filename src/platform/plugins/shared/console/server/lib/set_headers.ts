/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';

const isPlainObjectRecord = (value: unknown): value is Record<string, unknown> =>
  isPlainObject(value);

export function setHeaders(
  originalHeaders: Record<string, string | string[] | undefined>,
  newHeaders: Record<string, unknown>
): Record<string, unknown>;
export function setHeaders(originalHeaders: unknown, newHeaders: unknown): Record<string, unknown>;
export function setHeaders(originalHeaders: unknown, newHeaders: unknown): Record<string, unknown> {
  if (!isPlainObjectRecord(originalHeaders)) {
    throw new Error(
      `Expected originalHeaders to be an object, but ${typeof originalHeaders} given`
    );
  }
  if (!isPlainObjectRecord(newHeaders)) {
    throw new Error(`Expected newHeaders to be an object, but ${typeof newHeaders} given`);
  }

  return {
    ...originalHeaders,
    ...newHeaders,
  };
}
