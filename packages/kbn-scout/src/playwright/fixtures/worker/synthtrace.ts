/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ApmSynthtraceEsClient,
  OtelSynthtraceEsClient,
  InfraSynthtraceEsClient,
} from '@kbn/apm-synthtrace';
import { Readable } from 'stream';
import type { ApmFields, InfraDocument, OtelDocument } from '@kbn/apm-synthtrace-client';
import Url from 'url';
import {
  getApmSynthtraceEsClient,
  getInfraSynthtraceEsClient,
  getOtelSynthtraceEsClient,
} from '../../../common/services/synthtrace';
import { coreWorkerFixtures } from './core_fixtures';
import type { SynthtraceEvents } from '../../global_hooks/synthtrace_ingestion';

export interface SynthtraceFixture {
  apmSynthtraceEsClient: {
    index: (events: SynthtraceEvents<ApmFields>) => Promise<void>;
    clean: ApmSynthtraceEsClient['clean'];
  };
  infraSynthtraceEsClient: {
    index: (events: SynthtraceEvents<InfraDocument>) => Promise<void>;
    clean: InfraSynthtraceEsClient['clean'];
  };
  otelSynthtraceEsClient: {
    index: (events: SynthtraceEvents<OtelDocument>) => Promise<void>;
    clean: OtelSynthtraceEsClient['clean'];
  };
}

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

      const index = async (events: SynthtraceEvents<ApmFields>) =>
        await apmSynthtraceEsClient.index(
          Readable.from(Array.from(events).flatMap((event) => event.serialize()))
        );

      const clean = async () => await apmSynthtraceEsClient.clean();

      await use({ index, clean });

      // cleanup function after all tests have ran
      await apmSynthtraceEsClient.clean();
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

      const index = async (events: SynthtraceEvents<InfraDocument>) =>
        await infraSynthtraceEsClient.index(
          Readable.from(Array.from(events).flatMap((event) => event.serialize()))
        );

      const clean = async () => await infraSynthtraceEsClient.clean();

      await use({ index, clean });

      // cleanup function after all tests have ran
      await infraSynthtraceEsClient.clean();
    },
    { scope: 'worker' },
  ],
  otelSynthtraceEsClient: [
    async ({ esClient, log }, use) => {
      const otelSynthtraceEsClient = await getOtelSynthtraceEsClient(esClient, log);

      const index = async (events: SynthtraceEvents<OtelDocument>) =>
        await otelSynthtraceEsClient.index(
          Readable.from(Array.from(events).flatMap((event) => event.serialize()))
        );

      const clean = async () => await otelSynthtraceEsClient.clean();

      await use({ index, clean });

      // cleanup function after all tests have ran
      await otelSynthtraceEsClient.clean();
    },
    { scope: 'worker' },
  ],
});
