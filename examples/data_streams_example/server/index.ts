/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataStreamDefinition, mappings } from '@kbn/core-data-streams-server';
import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';

interface MyDocument {
  '@timestamp': string;
  description: string;
}

const dataStream: DataStreamDefinition<MyDocument> = {
  name: '.kibana-my-data-stream',
  version: 1,
  template: {
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': mappings.date(),
        description: mappings.text(),
      },
    },
  },
};

export const plugin = (ctx: PluginInitializerContext) => {
  return {
    setup({ dataStreams }: CoreSetup) {
      dataStreams.registerDataStream(dataStream);
    },
    start({ dataStreams }: CoreStart) {
      const client = dataStreams.getClient(dataStream);
      void client
        .index({
          document: {
            '@timestamp': new Date().toISOString(),
            description: 'This is a test document for my data stream.',
          },
        })
        .then((result) => {
          ctx.logger.get('data-streams-example').info(JSON.stringify(result, null, 2));
        });
    },
    stop() {},
  };
};
