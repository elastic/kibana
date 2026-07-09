/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkUpsertIndexResolver, BulkUpsertRequestOptions, UpsertDocument } from '../../types';

export const resolveBulkIndexName = <TDoc extends { id: string }>(
  indexName: BulkUpsertIndexResolver<TDoc>,
  document: UpsertDocument<TDoc>
): string => {
  return typeof indexName === 'function' ? indexName(document) : indexName;
};

export const allDocumentsShareIndex = <TDoc extends { id: string }>(
  documents: UpsertDocument<TDoc>[],
  indexName: BulkUpsertIndexResolver<TDoc>
): string | undefined => {
  if (documents.length === 0) {
    return undefined;
  }

  const firstIndex = resolveBulkIndexName(indexName, documents[0]);
  for (const document of documents.slice(1)) {
    if (resolveBulkIndexName(indexName, document) !== firstIndex) {
      return undefined;
    }
  }

  return firstIndex;
};

export const extractBulkWriteEsOptions = (
  request: BulkUpsertRequestOptions
): Pick<
  BulkUpsertRequestOptions,
  'refresh' | 'pipeline' | 'require_alias' | 'wait_for_active_shards'
> => {
  const { refresh = false, pipeline, require_alias, wait_for_active_shards } = request;

  return {
    refresh,
    ...(pipeline !== undefined ? { pipeline } : {}),
    ...(require_alias !== undefined ? { require_alias } : {}),
    ...(wait_for_active_shards !== undefined ? { wait_for_active_shards } : {}),
  };
};
