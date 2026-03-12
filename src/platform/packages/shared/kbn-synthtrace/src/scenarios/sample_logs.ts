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

  const { rpm, streamType, systems, isLogsEnabled, skipFork } = (runOptions.scenarioOpts ?? {}) as {
    rpm?: number;
    systems?: string | string[];
    streamType?: 'classic' | 'wired';
    skipFork?: boolean;
    isLogsEnabled?: boolean;
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

      if (skipFork) {
        return;
      }

      const setupChildStreams = async (rootStream: string) => {
        const isEcsStream = rootStream === 'logs.ecs';
        // OTel streams use 'attributes.' prefix, ECS streams don't
        const prefix = isEcsStream ? '' : 'attributes.';
        const customPrefix = 'attributes.';

        // Setting linux child stream
        await streamsClient.forkStream(
          rootStream,
          {
            stream: { name: `${rootStream}.linux` },
            where: { field: `${prefix}filepath`, eq: 'Linux.log' },
          },
          { ignore: [409] }
        );

        // Setting windows child stream
        await streamsClient.forkStream(
          rootStream,
          {
            stream: { name: `${rootStream}.windows` },
            where: { field: `${prefix}filepath`, eq: 'Windows.log' },
          },
          { ignore: [409] }
        );

        // Setting android child stream
        await streamsClient.forkStream(
          rootStream,
          {
            stream: { name: `${rootStream}.android` },
            where: { field: `${prefix}filepath`, eq: 'Android.log' },
          },
          {
            ignore: [409],
          }
        );

        await streamsClient.enableFailureStore(`${rootStream}.android`);

        // For ECS streams, don't define custom wired fields - rely on dynamic mapping
        // For OTel streams, define the fields with attributes namespace
        const wiredFields = isEcsStream
          ? { fields: {}, routing: [] }
          : {
              fields: {
                [`${prefix}process.name`]: { type: 'keyword', ignore_above: 18 },
                [`${customPrefix}secure`]: { type: 'boolean' },
              },
              routing: [],
            };

        await streamsClient.putIngestStream(`${rootStream}.android`, {
          ingest: {
            lifecycle: { inherit: {} },
            settings: {},
            processing: {
              steps: [
                // Set up some failed documents
                {
                  condition: {
                    field: `${prefix}user.name`,
                    eq: 'user1',
                    steps: [
                      {
                        action: 'date',
                        where: {
                          always: {},
                        },
                        from: `${prefix}user.name`,
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
                  to: `${customPrefix}secure`,
                  value: 'false',
                  override: true,
                  ignore_failure: false,
                  customIdentifier: 'i89cd8e40-c072-11f0-b0d2-fb65f5013a7f',
                },
                // Set up some documents with boolean `true` value
                {
                  action: 'set',
                  where: {
                    field: `${prefix}user.name`,
                    eq: 'user3',
                  },
                  to: `${customPrefix}secure`,
                  value: 'true',
                  override: true,
                  ignore_failure: false,
                  customIdentifier: 'icedf22a0-c072-11f0-b0d2-fb65f5013a7f',
                },
              ],
            },
            wired: wiredFields,
            failure_store: { inherit: {} },
          } as WiredIngestUpsertRequest,
        });
      };

      try {
        // Set up legacy logs stream if enabled
        if (isLogsEnabled) {
          logger.info('Setting up legacy logs and child streams');
          await setupChildStreams('logs');
        }

        logger.info('Setting up logs.otel and child streams');
        await setupChildStreams('logs.otel');

        logger.info('Setting up logs.ecs and child streams');
        await setupChildStreams('logs.ecs');
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
