/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FullConfig } from 'playwright/test';
import Url from 'url';
import { Readable } from 'node:stream';
import type {
  ApmFields,
  ApmOtelFields,
  Fields,
  InfraDocument,
  Serializable,
  SynthtraceGenerator,
} from '@kbn/apm-synthtrace-client';
import {
  LogLevel,
  SynthtraceClientTypes,
  createLogger,
  SynthtraceClientsManager,
} from '@kbn/apm-synthtrace';
import {
  getLogger,
  createScoutConfig,
  measurePerformanceAsync,
  getEsClient,
  ScoutLogger,
  EsClient,
} from '../../common';
import { ScoutTestOptions } from '../types';

export type SynthtraceEvents<T extends Fields> = SynthtraceGenerator<T> | Array<Serializable<T>>;

interface SynthtraceIngestionData {
  apm: Array<SynthtraceEvents<ApmFields | ApmOtelFields>>;
  infra: Array<SynthtraceEvents<InfraDocument>>;
}

const INGESTION_CLIENT_MAP: Record<string, SynthtraceClientTypes> = {
  apm: 'apmEsClient',
  infra: 'infraEsClient',
};

const getSynthtraceClient = async (
  synthClient: SynthtraceClientTypes,
  esClient: EsClient,
  kbnUrl: string,
  auth: { username: string; password: string },
  log: ScoutLogger
) => {
  const kibanaUrl = new URL(kbnUrl);
  const kibanaUrlWithAuth = Url.format({
    protocol: kibanaUrl.protocol,
    hostname: kibanaUrl.hostname,
    port: kibanaUrl.port,
    auth: `${auth.username}:${auth.password}`,
  });

  const logger = createLogger(LogLevel.info);

  const clientManager = new SynthtraceClientsManager({
    client: esClient,
    logger,
    refreshAfterIndex: true,
    includePipelineSerialization: false,
  });

  const clients = clientManager.getClients({
    clients: [synthClient],
    kibana: {
      target: kibanaUrlWithAuth,
    },
  });

  return clients[synthClient];
};

/**
 * @deprecated Use `globalSetupHook` and synthtrace fixtures instead
 */
export async function ingestSynthtraceDataHook(config: FullConfig, data: SynthtraceIngestionData) {
  const log = getLogger();

  const { apm, infra } = data;
  const hasApmData = apm.length > 0;
  const hasInfraData = infra.length > 0;
  const hasAnyData = hasApmData || hasInfraData;

  if (!hasAnyData) {
    log.debug('[setup] no synthtrace data to ingest');
    return;
  }

  return measurePerformanceAsync(log, '[setup]: ingestSynthtraceDataHook', async () => {
    // TODO: This should be configurable local vs cloud

    const configName = 'local';
    const projectUse = config.projects[0].use as ScoutTestOptions;
    const serversConfigDir = projectUse.serversConfigDir;
    const scoutConfig = createScoutConfig(serversConfigDir, configName, log);
    const esClient = getEsClient(scoutConfig, log);
    const kbnUrl = scoutConfig.hosts.kibana;

    for (const key of Object.keys(data)) {
      const typedKey = key as keyof SynthtraceIngestionData;
      if (data[typedKey].length > 0) {
        const client = await getSynthtraceClient(
          INGESTION_CLIENT_MAP[key],
          esClient,
          kbnUrl,
          scoutConfig.auth,
          log
        );

        log.debug(`[setup] ingesting ${key} synthtrace data`);

        try {
          await Promise.all(
            data[typedKey].map((event) => {
              return client.index(Readable.from(Array.from(event).flatMap((e) => e.serialize())));
            })
          );
        } catch (e) {
          log.debug(`[setup] error ingesting ${key} synthtrace data`, e);
        }

        log.debug(`[setup] ${key} synthtrace data ingested successfully`);
      } else {
        log.debug(`[setup] no synthtrace data to ingest for ${key}`);
      }
    }
  });
}
