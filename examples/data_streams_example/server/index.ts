/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataStreamDefinition } from '@kbn/core-data-streams-server';
import { mappings, type MappingsToProperties } from '@kbn/es-mappings';
import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';

const dataStreamMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    description: mappings.text(),
  },
};

const dataStream: DataStreamDefinition<typeof dataStreamMappings> = {
  name: '.kibana-my-data-stream',
  version: 1,
  template: {
    mappings: dataStreamMappings,
  },
};

type DataStreamDocument = MappingsToProperties<typeof dataStreamMappings>;

export const plugin = (ctx: PluginInitializerContext) => {
  return {
    setup({ dataStreams }: CoreSetup) {
      dataStreams.registerDataStream(dataStream);
    },
    start({ dataStreams, elasticsearch }: CoreStart) {
      const client = dataStreams.getClient<typeof dataStreamMappings, {}>(dataStream.name);

      const document: DataStreamDocument = {
        '@timestamp': new Date().toISOString(),
        description: 'This is a test document for my data stream.',
      };

      void client
        .index({
          document,
        })
        .then((result) => {
          ctx.logger.get('data-streams-example').info(JSON.stringify(result, null, 2));
        });

      return {
        getDocument: async (id: string) => {
          const result = await client.search({
            body: {
              query: {
                term: { description: 'This is a test document for my data stream.' },
              },
            },
          });

          return result;
        },
      };
    },
    stop() {},
  };
};
