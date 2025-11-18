/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mappings } from '@kbn/es-mappings';

import type { MappingsDefinition, GetFieldsOf } from '@kbn/es-mappings';

import type { Logger } from '@kbn/logging';
import type { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { DataStreamClient } from '../client';
import type { DataStreamDefinition } from '../types';

const dataStreamMapping = {
  dynamic: false as const,
  properties: {
    name: mappings.text(),
    age: mappings.integer(),
    '@timestamp': mappings.date(),
  },
} satisfies MappingsDefinition;

export type ExactDataStreamDocument = GetFieldsOf<typeof dataStreamMapping>;
export interface FullDataStreamDocument {
  _id?: string;
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  '@timestamp': string;
}

const dataStreamDefinition: DataStreamDefinition = {
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
  const client = await DataStreamClient.initialize<typeof dataStreamDefinition>({
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
        non_exist: 'John Doe',
      },
    },
  });

  return response.hits.hits.map((hit) => {
    return hit._source!.name;
  });
};
