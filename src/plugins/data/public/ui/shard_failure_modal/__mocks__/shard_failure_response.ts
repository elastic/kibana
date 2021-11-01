/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const shardFailureResponse: estypes.SearchResponse<any> = {
  _shards: {
    total: 2,
    successful: 1,
    skipped: 0,
    failed: 1,
    failures: [
      {
        shard: 0,
        index: 'repro2',
        node: 'itsmeyournode',
        reason: {
          type: 'script_exception',
          reason: 'runtime error',
          script_stack: ["return doc['targetfield'].value;", '           ^---- HERE'],
          script: "return doc['targetfield'].value;",
          lang: 'painless',
          caused_by: {
            type: 'illegal_argument_exception',
            reason: 'Gimme reason',
          },
        },
      },
    ],
  },
} as any;
