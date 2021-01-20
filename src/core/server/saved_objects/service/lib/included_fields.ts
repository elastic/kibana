/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

function toArray(value: string | string[]): string[] {
  return typeof value === 'string' ? [value] : value;
}
/**
 * Provides an array of paths for ES source filtering
 */
export function includedFields(type: string | string[] = '*', fields?: string[] | string) {
  if (!fields || fields.length === 0) {
    return;
  }

  // convert to an array
  const sourceFields = toArray(fields);
  const sourceType = toArray(type);

  return sourceType
    .reduce((acc: string[], t) => {
      return [...acc, ...sourceFields.map((f) => `${t}.${f}`)];
    }, [])
    .concat('namespace')
    .concat('namespaces')
    .concat('type')
    .concat('references')
    .concat('migrationVersion')
    .concat('updated_at')
    .concat('originId')
    .concat(fields); // v5 compatibility
}
