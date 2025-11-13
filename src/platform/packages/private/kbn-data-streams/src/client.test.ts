/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mappings } from '@kbn/es-mappings';
import type { DataStreamDefinition } from './types';
import { DataStreamClient } from './client';
import type { Logger } from '@kbn/logging';
import type { Client as ElasticsearchClient } from '@elastic/elasticsearch';

const dataStreamDefinition: DataStreamDefinition = {
  name: 'test-data-stream',
  version: 1,
  template: {
    mappings: {
      properties: {
        '@timestamp': mappings.date(),
        keywordField: mappings.keyword(),
      },
    },
  },
};

const elasticsearchClient = {} as unknown as ElasticsearchClient;
const logger = {} as unknown as Logger;

describe('DataStreamClient', () => {
  it('should initialize the client', async () => {
    const client = await DataStreamClient.initialize({
      dataStream: dataStreamDefinition,
      elasticsearchClient,
      logger,
    });

    client.index({
      document: {
        keywordField: 'anyvalue',
        unknownField: 'anyvalue',
        dateField: new Date().toISOString(),
      },
    });

    const response = await client.search({
      query: {
        term: {
          keywordField: 'anyvalue',
        },
      },
    });
    const hits = response.hits.hits.map((hit) => hit._source);

    hits.forEach((hit) => {
      expect(hit.keywordField).toBeDefined();
    });
  });
});
