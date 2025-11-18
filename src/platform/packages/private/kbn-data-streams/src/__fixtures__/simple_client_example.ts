/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingsDefinition } from '@kbn/es-mappings';
import type { Logger } from '@kbn/logging';
import type { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { mappings } from '@kbn/es-mappings';
import type { DataStreamDefinition } from '../types';

import { DataStreamClient } from '../client';

const dataStreamMapping = {
  dynamic: false,
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    isActive: mappings.boolean(),
    '@timestamp': mappings.date(),
  },
} satisfies MappingsDefinition;

const dataStreamDefinition: DataStreamDefinition<typeof dataStreamMapping> = {
  name: 'test-data-stream',
  version: 1,
  template: {
    mappings: dataStreamMapping,
  },
};

/**
 * A simple client example that demonstrates the basic usage of the DataStreamClient.
 * It infers the types of the mappings and the document from the definition.
 * The inference will assume all the documents in _source are mapped.
 *
 * Check the full client example for extending _source that are not mapped in the schema.
 */
export const simpleClientExample = async (
  elasticsearchClient: ElasticsearchClient,
  logger: Logger
) => {
  const client = await DataStreamClient.initialize({
    dataStream: dataStreamDefinition,
    elasticsearchClient,
    logger,
  });

  await client.index({
    index: dataStreamDefinition.name,
    document: {
      name: 'John Doe',
      age: 30,
      isActive: true,
      '@timestamp': new Date().toISOString(),
    },
  });

  await client.index({
    index: dataStreamDefinition.name,
    document: {
      name: 'John Doe',
      age: 30,
      isActive: true,
      '@timestamp': +new Date(), // number is also valid as date inferred from schema is string | number
    },
  });

  await client.index({
    index: dataStreamDefinition.name,
    document: {
      name: 'John Doe',
      age: 30,
      // @ts-expect-error - unknown field
      unknownField: 'not defined in the schema',
      '@timestamp': new Date().toISOString(),
    },
  });

  await client.index({
    index: dataStreamDefinition.name,
    document: {
      name: 'John Doe',
      age: 30,
      // @ts-expect-error - isActive must be a boolean
      isActive: 'must be a bool value',
      '@timestamp': new Date().toISOString(),
    },
  });

  await client.bulk({
    operations: [
      {
        index: {
          document: {
            '@timestamp': new Date().toISOString(),
          },
        },
      },
      {
        delete: {
          _id: '123',
        },
      },
    ],
  });

  await client.bulk({
    // @ts-expect-error - index is not a valid property of ClientBulkRequest
    index: dataStreamDefinition.name,
    operations: [
      {
        delete: { _id: '123' },
      },
    ],
  });

  const response = await client.search({
    query: {
      term: {
        non_exist: 'John Doe',
      },
    },
  });

  return response.hits.hits.map((hit) => {
    if (!hit._source) {
      return null;
    }

    return {
      '@timestamp': hit._source['@timestamp'],
      name: hit._source.name,
      age: hit._source.age,
      isActive: hit._source.isActive,
      // @ts-expect-error - unknown field
      unknownField: hit._source.unknownField,
    };
  });
};
