/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates log documents based on the sample log parser.
 */

import type { LogDocument } from '@kbn/apm-synthtrace-client';
import { Serializable } from '@kbn/apm-synthtrace-client';
import { SampleParserClient } from '@kbn/sample-log-parser';
import type { WiredIngest, WiredStream } from '@kbn/streams-schema/src/models/ingest/wired';
import { castArray } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const client = new SampleParserClient({ logger });

  const { rpm, streamType, systems } = (runOptions.scenarioOpts ?? {}) as {
    rpm?: number;
    systems?: string | string[];
    streamType?: 'classic' | 'wired';
  };

  const generators = await client.getLogGenerators({
    rpm,
    streamType: streamType === 'classic' ? 'classic' : 'wired',
    systems: {
      loghub: castArray(systems ?? []).flatMap((item) => item.split(',')),
    },
  });

  return {
    bootstrap: async ({ streamsClient }) => {
      await streamsClient.enable();

      try {
        // Setting linux child stream
        await streamsClient.forkStream(
          'logs',
          {
            stream: { name: 'logs.linux' },
            where: { field: 'attributes.filepath', eq: 'Linux.log' },
          },
          { ignore: [409] }
        );

        // Setting windows child stream
        await streamsClient.forkStream(
          'logs',
          {
            stream: { name: 'logs.windows' },
            where: { field: 'attributes.filepath', eq: 'Windows.log' },
          },
          { ignore: [409] }
        );

        // Setting android child stream
        await streamsClient.forkStream(
          'logs',
          {
            stream: { name: 'logs.android' },
            where: { field: 'attributes.filepath', eq: 'Android.log' },
          },
          {
            ignore: [409],
          }
        );

        await streamsClient.enableFailureStore('logs.android');
        await streamsClient.putIngestStream('logs.android', {
          ingest: {
            lifecycle: { inherit: {} },
            settings: {},
            processing: {
              steps: [],
            },
            wired: {
              fields: {
                'attributes.process.name': { type: 'keyword', ignore_above: 18 },
              },
              routing: [],
            },
            failure_store: { inherit: {} },
          } as WiredIngest,
        } as WiredStream.Definition);
      } catch (error) {
        logger.error(new Error(`Error occurred while forking streams`, { cause: error }));
      }
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
