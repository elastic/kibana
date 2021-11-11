/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ElasticsearchClient } from '../elasticsearch_client';

export const getPolicyExists = async (
  esClient: ElasticsearchClient,
  name: string
): Promise<boolean> => {
  try {
    await esClient.ilm.getLifecycle({
      name,
    });
    // Return true that there exists a policy which is not 404 or some error
    // Since there is not a policy exists API, this is how we create one by calling
    // into the API to get it if it exists or rely on it to throw a 404
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      return false;
    } else {
      throw err;
    }
  }
};
