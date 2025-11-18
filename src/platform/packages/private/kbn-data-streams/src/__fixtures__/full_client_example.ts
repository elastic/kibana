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
  });

  await client.index({
    index: dataStreamDefinition.name,
    document: {
      name: 'John Doe',
      age: 30,
      unmappedField: 'Unmapped but defined in the document interface',
      '@timestamp': new Date().toISOString(),
    },
  });

  await client.bulk({
    operations: [
      {
        index: {
          document: {
            name: 'John Doe',
            age: 30,
            unmappedField: 'Unmapped but defined in the document interface',
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
