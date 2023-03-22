/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GetResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FileMetadata } from '../../common';

export function createDefaultFileAttributes(): Pick<
  FileMetadata,
  'created' | 'Updated' | 'Status'
> {
  const dateString = new Date().toISOString();
  return {
    created: dateString,
    Status: 'AWAITING_UPLOAD',
    Updated: dateString,
  };
}

export const fetchDoc = async <TDocument = unknown>(
  esClient: ElasticsearchClient,
  index: string,
  docId: string,
  indexIsAlias: boolean = false
): Promise<GetResponse<TDocument> | undefined> => {
  if (indexIsAlias) {
    const fileDocSearchResult = await esClient.search<TDocument>({
      index,
      body: {
        size: 1,
        query: {
          term: {
            _id: docId,
          },
        },
      },
    });

    return fileDocSearchResult.hits.hits[0] as GetResponse<TDocument>;
  }

  return esClient.get<TDocument>({
    index,
    id: docId,
  });
};
