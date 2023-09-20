/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

/**
 * checks if data stream exists
 * @param esClient
 * @param name
 */
export const getDataStreamExists = async (
  esClient: ElasticsearchClient,
  name: string
): Promise<boolean> => {
  try {
    const body = await esClient.indices.getDataStream({ name, expand_wildcards: 'all' });
    return body.data_streams.length > 0;
  } catch (err) {
    if (err.body != null && err.body.status === 404) {
      return false;
    } else if (
      // if index already created, _data_stream/${name} request will produce the following error
      // data stream does not exist at this point, so we can return false
      err?.body?.error?.reason?.includes(
        `The provided expression [${name}] matches an alias, specify the corresponding concrete indices instead.`
      )
    ) {
      return false;
    } else {
      throw err.body ? err.body : err;
    }
  }
};
