/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export const COMMENTS_INDEX = '.kibana-dev-comments';

const keyword = { type: 'keyword' } as const;

/** Only queried fields are mapped; anchors are stored verbatim so the UI can evolve their shape without reindexing. */
const MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    author: { properties: { username: keyword, displayName: keyword } },
    text: { type: 'text' },
    resolved: { type: 'boolean' },
    replies: { type: 'object', enabled: false },
    route: {
      properties: {
        pageKey: keyword,
        path: { type: 'keyword', index: false },
      },
    },
    anchor: { type: 'object', enabled: false },
    trail: { type: 'object', enabled: false },
    snapshot: {
      properties: {
        mimeType: keyword,
        width: { type: 'integer' },
        height: { type: 'integer' },
        image: { type: 'binary' },
      },
    },
  },
};

export const ensureCommentsIndex = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  if (await esClient.indices.exists({ index: COMMENTS_INDEX })) {
    return;
  }
  try {
    await esClient.indices.create({
      index: COMMENTS_INDEX,
      settings: { hidden: true, number_of_shards: 1, auto_expand_replicas: '0-1' },
      mappings: MAPPINGS,
    });
  } catch (error) {
    // Another Kibana instance (or request) created it between the two calls.
    if (
      error instanceof errors.ResponseError &&
      error.body?.error?.type === 'resource_already_exists_exception'
    ) {
      return;
    }
    throw error;
  }
  logger.info(`Created dev comments index [${COMMENTS_INDEX}]`);
};
