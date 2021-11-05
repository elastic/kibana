/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../elasticsearch_client';

// See the reference(s) below on explanations about why -000001 was chosen and
// why the is_write_index is true as well as the bootstrapping step which is needed.
// Ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/applying-policy-to-template.html
export const createBootstrapIndex = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<unknown> => {
  return (
    await esClient.indices.create(
      {
        index: `${index}-000001`,
        body: {
          aliases: {
            [index]: {
              is_write_index: true,
            },
          },
        },
      },
      { meta: true }
    )
  ).body;
};
