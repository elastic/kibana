/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mappings } from '@kbn/es-mappings';

import type { MappingsDefinition } from '@kbn/es-mappings';

import type { Logger } from '@kbn/logging';
import type { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { DataStreamClient } from '../client';
import type { DataStreamDefinition } from '../types';

const dataStreamMapping = {
  dynamic: false,
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    '@timestamp': mappings.date(),
  },
} satisfies MappingsDefinition;

export interface FullDataStreamDocument {
  name: string;
  age: number;
  email?: string;
  unmappedField?: string;
  '@timestamp': string;
}

const dataStreamDefinition: DataStreamDefinition<typeof dataStreamMapping, FullDataStreamDocument> =
  {
    name: 'test-data-stream',
    version: 1,
    template: {
      mappings: dataStreamMapping,
    },
  };

export const exampleDataStreamClientOperations = async (
  elasticsearchClient: ElasticsearchClient,
  logger: Logger
) => {
  const client = await DataStreamClient.initialize<
    typeof dataStreamMapping,
    FullDataStreamDocument
  >({
    dataStream: dataStreamDefinition,
    elasticsearchClient,
    logger,
    lazyCreation: false,
  });
  if (!client) {
    throw new Error('Client not initialized properly');
  }

  await client.create({
    documents: [
      {
        name: 'John Doe',
        age: 30,
        unmappedField: 'Unmapped but defined in the document interface',
        '@timestamp': new Date().toISOString(),
      },
    ],
  });

  await client.create({
    documents: [
      {
        name: 'Jane Doe',
        age: 25,
        unmappedField: 'Unmapped but defined in the document interface',
        '@timestamp': new Date().toISOString(),
      },
      {
        _id: 'custom-id-123',
        name: 'Bob Smith',
        age: 35,
        unmappedField: 'Another unmapped field',
        '@timestamp': new Date().toISOString(),
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
      unmappedField: hit._source.unmappedField,
      // @ts-expect-error - unknown field
      unknownField: hit._source.unknownField,
    };
  });
};
