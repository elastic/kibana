/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function isDefinedAndHasValue(value: string | undefined): value is string {
  return isDefined(value) && value.length > 0;
}

export const combineSource = (value: string | string[], separator: string = ''): string => {
  if (Array.isArray(value)) return value.join(separator);
  return value;
};
