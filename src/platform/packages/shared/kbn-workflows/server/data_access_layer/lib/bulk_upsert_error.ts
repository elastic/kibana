/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkUpsertResponse } from '../types';

export const EMPTY_BULK_UPSERT_RESPONSE: BulkUpsertResponse = {
  took: 0,
  errors: false,
  items: [],
};

export const throwBulkWriteError = (
  operation: 'create' | 'update' | 'upsert',
  response: BulkUpsertResponse
): never => {
  const erroredDocuments = response.items
    .filter((item) => item.error !== undefined)
    .map((item) => ({
      id: item.id,
      error: item.error,
      status: item.status,
    }));

  throw new Error(
    `Failed to ${operation} ${erroredDocuments.length} document(s): ${JSON.stringify(erroredDocuments)}`
  );
};

export const throwBulkUpsertError = (response: BulkUpsertResponse): never => {
  return throwBulkWriteError('upsert', response);
};

export const throwBulkUpdateError = (response: BulkUpsertResponse): never => {
  return throwBulkWriteError('update', response);
};

export const assertBulkUpsertSuccess = (response: BulkUpsertResponse): BulkUpsertResponse => {
  if (response.errors) {
    throwBulkUpsertError(response);
  }

  return response;
};

export const assertBulkUpdateSuccess = (response: BulkUpsertResponse): BulkUpsertResponse => {
  if (response.errors) {
    throwBulkUpdateError(response);
  }

  return response;
};
