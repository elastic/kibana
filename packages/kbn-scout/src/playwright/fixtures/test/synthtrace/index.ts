/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ApmSynthtraceEsClient,
  OtelSynthtraceEsClient,
  createLogger,
  LogLevel,
  ApmSynthtraceKibanaClient,
  InfraSynthtraceEsClient,
  InfraSynthtraceKibanaClient,
} from '@kbn/apm-synthtrace';
import { Readable } from 'stream';
import type {
  ApmFields,
  Fields,
  InfraDocument,
  OtelDocument,
  Serializable,
  SynthtraceGenerator,
} from '@kbn/apm-synthtrace-client';
import Url from 'url';
import { coreWorkerFixtures } from '../../worker';

type SynthtraceEvents<T extends Fields> = SynthtraceGenerator<T> | Array<Serializable<T>>;

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

export const synthtraceFixture = coreWorkerFixtures.extend<SynthtraceFixture>({
  apmSynthtraceEsClient: async ({ esClient, config, kbnUrl }, use) => {
    const logger = createLogger(LogLevel.info);
    const { username, password } = config.auth;
    const kibanaUrl = new URL(kbnUrl.get());
    const kibanaUrlWithAuth = Url.format({
      protocol: kibanaUrl.protocol,
      hostname: kibanaUrl.hostname,
      port: kibanaUrl.port,
      auth: `${username}:${password}`,
    });

    const apmSynthtraceKibanaClient = new ApmSynthtraceKibanaClient({
      logger,
      target: kibanaUrlWithAuth,
    });

    const version = await apmSynthtraceKibanaClient.fetchLatestApmPackageVersion();
    await apmSynthtraceKibanaClient.installApmPackage(version);
    const synthtraceEsClient = new ApmSynthtraceEsClient({
      client: esClient,
      logger,
      refreshAfterIndex: true,
      version,
    });

    synthtraceEsClient.pipeline(
      synthtraceEsClient.getDefaultPipeline({ includeSerialization: false })
    );

    const index = async (events: SynthtraceEvents<ApmFields>) =>
      await synthtraceEsClient.index(
        Readable.from(Array.from(events).flatMap((event) => event.serialize()))
      );

    const clean = async () => await synthtraceEsClient.clean();

    await use({ index, clean });

    // cleanup function after all tests have ran
    // await clean();
  },
  infraSynthtraceEsClient: async ({ esClient, config, kbnUrl }, use) => {
    const logger = createLogger(LogLevel.info);
    const { username, password } = config.auth;

    const infraSynthtraceKibanaClient = new InfraSynthtraceKibanaClient({
      logger,
      target: kbnUrl.get(),
      username,
      password,
    });

    const version = await infraSynthtraceKibanaClient.fetchLatestSystemPackageVersion();
    await infraSynthtraceKibanaClient.installSystemPackage(version);
    const synthtraceEsClient = new InfraSynthtraceEsClient({
      client: esClient,
      logger,
      refreshAfterIndex: true,
    });

    synthtraceEsClient.pipeline(
      synthtraceEsClient.getDefaultPipeline({ includeSerialization: false })
    );

    const index = async (events: SynthtraceEvents<InfraDocument>) =>
      await synthtraceEsClient.index(
        Readable.from(Array.from(events).flatMap((event) => event.serialize()))
      );

    const clean = async () => await synthtraceEsClient.clean();

    await use({ index, clean });

    // cleanup function after all tests have ran
    // await synthtraceEsClient.clean();
  },
  otelSynthtraceEsClient: async ({ esClient }, use) => {
    const logger = createLogger(LogLevel.info);

    const synthtraceEsClient = new OtelSynthtraceEsClient({
      client: esClient,
      logger,
      refreshAfterIndex: true,
    });

    synthtraceEsClient.pipeline(
      synthtraceEsClient.getDefaultPipeline({ includeSerialization: false })
    );

    const index = async (events: SynthtraceEvents<OtelDocument>) =>
      await synthtraceEsClient.index(
        Readable.from(Array.from(events).flatMap((event) => event.serialize()))
      );

    const clean = async () => await synthtraceEsClient.clean();

    await use({ index, clean });

    // cleanup function after all tests have ran
    // await synthtraceEsClient.clean();
  },
});
