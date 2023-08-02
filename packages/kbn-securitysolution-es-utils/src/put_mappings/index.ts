/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '../elasticsearch_client';

/**
 * update mappings of index
 * @param esClient
 * @param index
 * @param mappings
 */
export const putMappings = async (
  esClient: ElasticsearchClient,
  index: string,
  mappings: Record<string, MappingProperty>
): Promise<unknown> => {
  return await esClient.indices.putMapping({
    index,
    properties: mappings,
  });
};
