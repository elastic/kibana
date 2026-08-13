/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type UnmappedFieldsPolicy = 'NULLIFY' | 'LOAD';

interface WithUnmappedFieldsOptions {
  policy?: UnmappedFieldsPolicy;
}

export const withUnmappedFields = (
  esqlQuery: string,
  { policy = 'NULLIFY' }: WithUnmappedFieldsOptions = {}
): string => {
  const header = `SET unmapped_fields="${policy}";`;
  if (esqlQuery.startsWith(header)) {
    return esqlQuery;
  }
  return `${header}\n${esqlQuery}`;
};
