/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

export const deleteAllIndex = async (
  esClient: ElasticsearchClient,
  pattern: string,
  maxAttempts = 5
): Promise<boolean> => {
  for (let attempt = 1; ; attempt++) {
    if (attempt > maxAttempts) {
      throw new Error(
        `Failed to delete indexes with pattern [${pattern}] after ${maxAttempts} attempts`
      );
    }

    // resolve pattern to concrete index names
    const { body: resp } = await esClient.indices.getAlias(
      {
        index: pattern,
      },
      { ignore: [404], meta: true }
    );

    // @ts-expect-error status doesn't exist on response
    if (resp.status === 404) {
      return true;
    }

    const indices = Object.keys(resp) as string[];

    // if no indexes exits then we're done with this pattern
    if (!indices.length) {
      return true;
    }

    // delete the concrete indexes we found and try again until this pattern resolves to no indexes
    await esClient.indices.delete({
      index: indices,
      ignore_unavailable: true,
    });
  }
};
