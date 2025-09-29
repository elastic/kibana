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
import { castArray } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

/**
 * Scenario for Serverless logs. Note that selecting all systems creates
 * memory pressure, and could cause the termination of a worker thread.
 */
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
      serverless: castArray(systems ?? []).flatMap((item) => item.split(',')),
    },
  });

  return {
    bootstrap: async ({ streamsClient }) => {
      await streamsClient.enable();
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
