/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Validates that a GraphQL document contains only read operations.
 * Rejects documents that declare a mutation or subscription operation.
 */
export const validateReadOnlyGraphQLQuery = (query: string): void => {
  const withoutBlockComments = query.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const withoutLineComments = withoutBlockComments.replace(/#[^\n]*/g, ' ');
  const normalized = withoutLineComments.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    throw new Error('GraphQL query must not be empty');
  }

  if (/\bmutation\b/i.test(normalized)) {
    throw new Error('GraphQL mutations are not allowed in read-only ingest queries');
  }

  if (/\bsubscription\b/i.test(normalized)) {
    throw new Error('GraphQL subscriptions are not allowed in read-only ingest queries');
  }
};
