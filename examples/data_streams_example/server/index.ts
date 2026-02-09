/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataStreamDefinition } from '@kbn/core-data-streams-server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings, type GetFieldsOf } from '@kbn/es-mappings';
import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';

const dataStreamMappings = {
  dynamic: false,
  properties: {
    name: mappings.text(),
    description: mappings.text(),
    age: mappings.integer(),
    isActive: mappings.boolean(),
    '@timestamp': mappings.date(),
  },
} satisfies MappingsDefinition;

const dataStream: DataStreamDefinition<typeof dataStreamMappings> = {
  name: '.kibana-my-data-stream',
  version: 1,
  template: {
    mappings: dataStreamMappings,
  },
};

interface DataStreamDocument extends GetFieldsOf<typeof dataStreamMappings> {
  name: string;
  description: string;
  age: number;
  isActive?: boolean;
  unMappedField?: string;
  '@timestamp': number;
}

export const plugin = (ctx: PluginInitializerContext) => {
  return {
    setup({ dataStreams }: CoreSetup) {
      dataStreams.registerDataStream(dataStream);
    },
    start({ dataStreams }: CoreStart) {
      const initializeClient = async () => {
        return await dataStreams.initializeClient<typeof dataStreamMappings, DataStreamDocument>(
          dataStream.name
        );
      };
      return {
        createSpecialDocument: async () => {
          const client = await initializeClient();
          const document: DataStreamDocument = {
            '@timestamp': +new Date(),
            name: 'John Doe',
            description: 'This is a test document for my data stream.',
            age: 30,
            unMappedField: 'Unmapped field but exists in the document _source',
          };

          const result = await client.create({
            documents: [document],
          });

          ctx.logger.get('data-streams-example').info(JSON.stringify(result, null, 2));
        },
        getDocument: async (id: string) => {
          const client = await initializeClient();

          const result = await client.search({
            query: {
              term: { description: 'This is a test document for my data stream.' },
            },
          });

          return result;
        },
      };
    },
    stop() {},
  };
};
