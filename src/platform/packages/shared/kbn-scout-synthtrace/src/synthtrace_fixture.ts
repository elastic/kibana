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
  ApmSynthtracePipelines,
  Fields,
  InfraDocument,
  SynthtraceGenerator,
  LogDocument,
} from '@kbn/synthtrace-client';
import type { SynthtraceEsClient } from '@kbn/synthtrace/src/lib/shared/base_client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace/src/lib/apm/client/apm_synthtrace_es_client';
import { coreWorkerFixtures } from '@kbn/scout';
import { getSynthtraceClient } from './get_synthtrace_client';

export interface ApmSynthtraceFixtureClient
  extends Pick<SynthtraceEsClient<ApmFields>, 'index' | 'clean'> {
  setPipeline: SynthtraceEsClient<ApmFields>['setPipeline'];
  resolvePipelineType: ApmSynthtraceEsClient['resolvePipelineType'];
}

export interface SynthtraceFixture {
  apmSynthtraceEsClient: ApmSynthtraceFixtureClient;
  infraSynthtraceEsClient: Pick<SynthtraceEsClient<InfraDocument>, 'index' | 'clean'>;
  logsSynthtraceEsClient: Pick<SynthtraceEsClient<LogDocument>, 'index' | 'clean'>;
}

const useSynthtraceClient = async <TFields extends Fields>(
  client: SynthtraceEsClient<TFields>,
  use: (client: Pick<SynthtraceEsClient<TFields>, 'index' | 'clean'>) => Promise<void>
) => {
  const index = async (
    events: SynthtraceGenerator<TFields>,
    pipelineCallback?: (base: Readable) => NodeJS.WritableStream
  ) => {
    await client.index(Readable.from(Array.from(events)), pipelineCallback);
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

      const index = async (
        events: SynthtraceGenerator<ApmFields>,
        pipelineCallback?: (base: Readable) => NodeJS.WritableStream
      ) => {
        await apmEsClient.index(Readable.from(Array.from(events)), pipelineCallback);
      };

      const clean = async () => await apmEsClient.clean();

      const setPipeline: ApmSynthtraceFixtureClient['setPipeline'] =
        apmEsClient.setPipeline.bind(apmEsClient);

      const resolvePipelineType: ApmSynthtraceFixtureClient['resolvePipelineType'] = (
        pipeline: ApmSynthtracePipelines,
        options?
      ) => apmEsClient.resolvePipelineType(pipeline, options);

      await use({ index, clean, setPipeline, resolvePipelineType });
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
