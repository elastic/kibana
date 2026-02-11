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

import type { LogDocument } from '@kbn/synthtrace-client';
import { Serializable } from '@kbn/synthtrace-client';
import { SampleParserClient } from '@kbn/sample-log-parser';
import type { WiredIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/wired';
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
              steps: [
                // Set up some failed documents
                {
                  condition: {
                    field: 'attributes.user.name',
                    eq: 'user1',
                    steps: [
                      {
                        action: 'date',
                        where: {
                          always: {},
                        },
                        from: 'attributes.user.name',
                        formats: ['UNIX_MS'],
                        ignore_failure: false,
                        customIdentifier: 'icd139630-bfc9-11f0-be91-458063de4bb2',
                      },
                    ],
                  },
                  customIdentifier: 'ic6001030-bfc9-11f0-be91-458063de4bb2',
                },
                // Set up some documents with boolean `false` value
                {
                  action: 'set',
                  where: {
                    always: {},
                  },
                  to: 'attributes.secure',
                  value: 'false',
                  override: true,
                  ignore_failure: false,
                  customIdentifier: 'i89cd8e40-c072-11f0-b0d2-fb65f5013a7f',
                },
                // Set up some documents with boolean `true` value
                {
                  action: 'set',
                  where: {
                    field: 'attributes.user.name',
                    eq: 'user3',
                  },
                  to: 'attributes.secure',
                  value: 'true',
                  override: true,
                  ignore_failure: false,
                  customIdentifier: 'icedf22a0-c072-11f0-b0d2-fb65f5013a7f',
                },
              ],
            },
            wired: {
              fields: {
                'attributes.process.name': { type: 'keyword', ignore_above: 18 },
                'attributes.secure': { type: 'boolean' },
              },
              routing: [],
            },
            failure_store: { inherit: {} },
          } as WiredIngestUpsertRequest,
        });
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
