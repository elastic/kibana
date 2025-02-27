/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, Serializable } from '@kbn/apm-synthtrace-client';
import { SampleParserClient } from '@kbn/sample-log-parser';
import { StreamQuery } from '@kbn/streams-schema';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const client = new SampleParserClient({ logger: runOptions.logger });

  const { rpm } = (runOptions.scenarioOpts ?? {}) as { rpm?: number };

  const generators = await client.getLogGenerators({
    rpm,
  });

  return {
    bootstrap: async ({ streamsClient }) => {
      await streamsClient.enable();

      for (const generator of generators) {
        const streamName = `logs.${generator.name.toLowerCase()}`;
        await streamsClient.forkStream('logs', {
          stream: {
            name: streamName,
          },
          if: {
            field: 'filepath',
            operator: 'eq',
            value: generator.filepath,
          },
        });

        await streamsClient.putStream(streamName, {
          dashboards: [],
          stream: {
            ingest: {
              lifecycle: {
                inherit: {},
              },
              routing: [],
              processing: [],
              wired: {
                fields: {},
              },
            },
          },
          queries: generator.queries.map((query): StreamQuery => {
            return {
              id: query.id,
              title: query.title,
              dsl: {
                query: query.query,
              },
              type: 'critical_event',
            };
          }),
        });
      }
    },
    teardown: async ({ streamsClient }) => {
      await streamsClient.disable();
    },
    generate: ({ range, clients: { streamsClient } }) => {
      return withClient(
        streamsClient,
        range.interval('5s').generator((timestamp) => {
          return generators.flatMap((generator) =>
            generator.next(timestamp).map((doc) => new Serializable(doc))
          );
        })
      );
    },
  };
};

export default scenario;
