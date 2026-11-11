/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const KQL_FIELD_SPECIAL = /([\\():<>"*{}\s])/g;

export function kqlField(field: string): string {
  return field.replace(KQL_FIELD_SPECIAL, '\\$1');
}

export function kqlValue(value: string | number | boolean): string {
  if (typeof value !== 'string') return String(value);
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function kqlEquals(field: string, value: string | number | boolean): string {
  return `${kqlField(field)}: ${kqlValue(value)}`;
}
