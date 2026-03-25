/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type ToArrayResult<V> = null extends V ? (NonNullable<V> | null)[] : NonNullable<V>[];

export function toArray<V>(value: V | V[] | null | undefined): ToArrayResult<V> {
  if (value === undefined) return [] as ToArrayResult<V>;
  if (value === null) return [null] as ToArrayResult<V>;
  return (Array.isArray(value) ? value : [value]) as ToArrayResult<V>;
}
