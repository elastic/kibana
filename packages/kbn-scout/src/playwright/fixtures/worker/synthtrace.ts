/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import type { ApmFields, Fields, InfraDocument, OtelDocument } from '@kbn/apm-synthtrace-client';
import Url from 'url';
import type { SynthtraceEsClient } from '@kbn/apm-synthtrace/src/lib/shared/base_client';
import {
  getApmSynthtraceEsClient,
  getInfraSynthtraceEsClient,
  getOtelSynthtraceEsClient,
} from '../../../common/services/synthtrace';
import { coreWorkerFixtures } from './core_fixtures';
import type { SynthtraceEvents } from '../../global_hooks/synthtrace_ingestion';

interface SynthtraceFixtureEsClient<TFields extends Fields> {
  index: (events: SynthtraceEvents<TFields>) => Promise<void>;
  clean: SynthtraceEsClient<TFields>['clean'];
}

export interface SynthtraceFixture {
  apmSynthtraceEsClient: SynthtraceFixtureEsClient<ApmFields>;
  infraSynthtraceEsClient: SynthtraceFixtureEsClient<InfraDocument>;
  otelSynthtraceEsClient: SynthtraceFixtureEsClient<OtelDocument>;
}

const useSynthtraceClient = async <TFields extends Fields>(
  client: SynthtraceEsClient<TFields>,
  use: (client: SynthtraceFixtureEsClient<TFields>) => Promise<void>
) => {
  const index = async (events: SynthtraceEvents<TFields>) =>
    await client.index(Readable.from(Array.from(events).flatMap((event) => event.serialize())));

  const clean = async () => await client.clean();

  await use({ index, clean });

  // cleanup function after all tests have ran
  await client.clean();
};

export const synthtraceFixture = coreWorkerFixtures.extend<{}, SynthtraceFixture>({
  apmSynthtraceEsClient: [
    async ({ esClient, config, kbnUrl, log }, use) => {
      const { username, password } = config.auth;
      const kibanaUrl = new URL(kbnUrl.get());
      const kibanaUrlWithAuth = Url.format({
        protocol: kibanaUrl.protocol,
        hostname: kibanaUrl.hostname,
        port: kibanaUrl.port,
        auth: `${username}:${password}`,
      });

      const apmSynthtraceEsClient = await getApmSynthtraceEsClient(
        esClient,
        kibanaUrlWithAuth,
        log
      );

      await useSynthtraceClient<ApmFields>(apmSynthtraceEsClient, use);
    },
    { scope: 'worker' },
  ],
  infraSynthtraceEsClient: [
    async ({ esClient, config, kbnUrl, log }, use) => {
      const infraSynthtraceEsClient = await getInfraSynthtraceEsClient(
        esClient,
        kbnUrl.get(),
        config.auth,
        log
      );

      await useSynthtraceClient<InfraDocument>(infraSynthtraceEsClient, use);
    },
    { scope: 'worker' },
  ],
  otelSynthtraceEsClient: [
    async ({ esClient, log }, use) => {
      const otelSynthtraceEsClient = await getOtelSynthtraceEsClient(esClient, log);

      await useSynthtraceClient<OtelDocument>(otelSynthtraceEsClient, use);
    },
    { scope: 'worker' },
  ],
});
