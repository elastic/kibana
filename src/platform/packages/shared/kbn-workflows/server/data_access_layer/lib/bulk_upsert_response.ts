/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

import type { BulkUpsertItemResponse, BulkUpsertResponse, UpsertDocument } from '../types';

const mapBulkItemToUpsertResponse = (
  id: string,
  item: estypes.BulkResponseItemContainer
): BulkUpsertItemResponse => {
  const operation = item.update ?? item.index ?? item.create;

  if (!operation) {
    return {
      id,
      status: 500,
      error: {
        type: 'bulk_upsert_error',
        reason: 'Bulk response item missing update/index/create operation',
      },
    };
  }

  return {
    id: operation._id ?? id,
    status: operation.status,
    result: operation.result,
    error: operation.error,
    _shards: operation._shards,
    _seq_no: operation._seq_no,
    _primary_term: operation._primary_term,
    _version: operation._version,
  };
};

export const toBulkUpsertResponseFromUpdate = (
  response: estypes.UpdateResponse,
  id: string
): BulkUpsertResponse => {
  const item: BulkUpsertItemResponse = {
    id: response._id ?? id,
    status: 200,
    result: response.result,
    _shards: response._shards,
    _seq_no: response._seq_no,
    _primary_term: response._primary_term,
    _version: response._version,
  };

  return {
    took: 0,
    errors: false,
    items: [item],
  };
};

export const toBulkUpsertResponseFromBulk = (
  response: estypes.BulkResponse,
  documents: Array<UpsertDocument<{ id: string }>>
): BulkUpsertResponse => {
  const items = response.items.map((item, index) =>
    mapBulkItemToUpsertResponse(documents[index]?.id ?? 'unknown', item)
  );

  return {
    took: response.took,
    errors: response.errors,
    ingest_took: response.ingest_took,
    items,
  };
};
