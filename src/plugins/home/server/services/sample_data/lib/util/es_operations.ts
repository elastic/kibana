/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IClusterClient } from '@kbn/core-elasticsearch-server';
import { BulkOperationType, ErrorCause } from '@elastic/elasticsearch/lib/api/types';

interface BulkResponseError {
  status: number;
  error?: string;
}

interface BulkResponseReturnValue {
  success: boolean;
  erroredDocuments?: BulkResponseError[];
}

export const deleteIndex = async (esClient: IClusterClient, index: string) => {
  const indexExists = await esClient.asInternalUser.indices.exists({
    index,
  });
  if (indexExists) {
    await esClient.asInternalUser.indices.delete({
      index,
    });
  }
};

export const createIndex = async (esClient: IClusterClient, index: string) => {
  await esClient.asInternalUser.indices.create({
    index,
    settings: {
      number_of_shards: 2,
      number_of_replicas: 0,
    },
  });
};

export const checkIfIndexExists = async (esClient: IClusterClient, index: string) => {
  return await esClient.asInternalUser.indices.exists({
    index,
  });
};

export const bulkUpload = async (
  esClient: IClusterClient,
  index: string,
  items: string
): Promise<BulkResponseReturnValue> => {
  const parsedItems = JSON.parse(items) as Array<Record<string, any>>;
  const operations = parsedItems.flatMap((doc) => [{ index: { _index: index } }, doc]);
  const bulkResponse = await esClient.asInternalUser.bulk({ refresh: true, operations });
  if (bulkResponse.errors) {
    const erroredDocuments: BulkResponseError[] = [];
    // The items array has the same order of the dataset we just indexed.
    // The presence of the `error` key indicates that the operation
    // that we did for the document has failed.
    bulkResponse.items.forEach((action, i) => {
      const operation = Object.keys(action)[0] as BulkOperationType;
      if (action[operation]!.error as ErrorCause) {
        erroredDocuments.push({
          // If the status is 429 it means that you can retry the document,
          // otherwise it's very likely a mapping error, and you should
          // fix the document before to try it again.
          status: action[operation]!.status,
          error: action[operation]!.error?.reason,
        });
      }
    });
    return {
      success: false,
      erroredDocuments,
    };
  }
  return {
    success: true,
  };
};
