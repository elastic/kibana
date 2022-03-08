/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

interface IndexAlias {
  alias: string;
  index: string;
  isWriteIndex: boolean;
}

/**
 * Retrieves all index aliases for a given alias name
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param alias alias name used to filter results
 *
 * @returns an array of {@link IndexAlias} objects
 */
export const getIndexAliases = async ({
  esClient,
  alias,
}: {
  esClient: ElasticsearchClient;
  alias: string;
}): Promise<IndexAlias[]> => {
  const response = await esClient.indices.getAlias(
    {
      name: alias,
    },
    { meta: true }
  );

  return Object.keys(response.body).map((index) => ({
    alias,
    index,
    isWriteIndex: response.body[index].aliases[alias]?.is_write_index === true,
  }));
};
