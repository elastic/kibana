/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import type {
  ApmFields,
  Fields,
  InfraDocument,
  SynthtraceGenerator,
  LogDocument,
} from '@kbn/apm-synthtrace-client';
import type { SynthtraceEsClient } from '@kbn/apm-synthtrace/src/lib/shared/base_client';
import { getSynthtraceClient } from '../../../common/services/synthtrace';
import { coreWorkerFixtures } from './core_fixtures';

export interface SynthtraceFixture {
  apmSynthtraceEsClient: Pick<SynthtraceEsClient<ApmFields>, 'index' | 'clean'>;
  infraSynthtraceEsClient: Pick<SynthtraceEsClient<InfraDocument>, 'index' | 'clean'>;
  logsSynthtraceEsClient: Pick<SynthtraceEsClient<LogDocument>, 'index' | 'clean'>;
}

const useSynthtraceClient = async <TFields extends Fields>(
  client: SynthtraceEsClient<TFields>,
  use: (client: Pick<SynthtraceEsClient<TFields>, 'index' | 'clean'>) => Promise<void>
) => {
  const index = async (events: SynthtraceGenerator<TFields>) => {
    await client.index(Readable.from(Array.from(events)));
  };

  const clean = async () => await client.clean();

  await use({ index, clean });
};

export const synthtraceFixture = coreWorkerFixtures.extend<{}, SynthtraceFixture>({
  apmSynthtraceEsClient: [
    async ({ esClient, config, kbnUrl, log }, use) => {
      const { apmEsClient } = await getSynthtraceClient('apmEsClient', {
        esClient,
        kbnUrl: kbnUrl.get(),
        log,
        config,
      });

      await useSynthtraceClient<ApmFields>(apmEsClient, use);
    },
    { scope: 'worker' },
  ],
  infraSynthtraceEsClient: [
    async ({ esClient, config, kbnUrl, log }, use) => {
      const { infraEsClient } = await getSynthtraceClient('infraEsClient', {
        esClient,
        kbnUrl: kbnUrl.get(),
        log,
        config,
      });

      await useSynthtraceClient<InfraDocument>(infraEsClient, use);
    },
    { scope: 'worker' },
  ],
  logsSynthtraceEsClient: [
    async ({ esClient, log, config }, use) => {
      const { logsEsClient } = await getSynthtraceClient('logsEsClient', {
        esClient,
        log,
        config,
      });

      await useSynthtraceClient<LogDocument>(logsEsClient, use);
    },
    { scope: 'worker' },
  ],
});
