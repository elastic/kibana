/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getEsShardTimeout } from './get_es_shard_timeout';

describe('getEsShardTimeout', () => {
  test('should return the elasticsearch.shardTimeout', async () => {
    const req = {
      getEsShardTimeout: async () => {
        return 12345;
      },
    };

    const timeout = await getEsShardTimeout(req);

    expect(timeout).toEqual(12345);
  });
});
