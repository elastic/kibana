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
  Fields,
  InfraDocument,
  OtelDocument,
  Serializable,
  SynthtraceGenerator,
} from '@kbn/apm-synthtrace-client';
import {
  getLogger,
  createScoutConfig,
  measurePerformanceAsync,
  getEsClient,
  ScoutLogger,
  EsClient,
} from '../../common';
import { ScoutTestOptions } from '../types';
import {
  getApmSynthtraceEsClient,
  getInfraSynthtraceEsClient,
  getOtelSynthtraceEsClient,
} from '../../common/services/synthtrace';

export type SynthtraceEvents<T extends Fields> = SynthtraceGenerator<T> | Array<Serializable<T>>;

interface SynthtraceIngestionData {
  apm: Array<SynthtraceEvents<ApmFields>>;
  infra: Array<SynthtraceEvents<InfraDocument>>;
  otel: Array<SynthtraceEvents<OtelDocument>>;
}

const getSynthtraceClient = (
  key: keyof SynthtraceIngestionData,
  esClient: EsClient,
  kbnUrl: string,
  auth: { username: string; password: string },
  log: ScoutLogger
) => {
  switch (key) {
    case 'apm':
      const kibanaUrl = new URL(kbnUrl);
      const kibanaUrlWithAuth = Url.format({
        protocol: kibanaUrl.protocol,
        hostname: kibanaUrl.hostname,
        port: kibanaUrl.port,
        auth: `${auth.username}:${auth.password}`,
      });
      return getApmSynthtraceEsClient(esClient, kibanaUrlWithAuth, log);
    case 'infra':
      return getInfraSynthtraceEsClient(esClient, kbnUrl, auth, log);
    case 'otel':
      return getOtelSynthtraceEsClient(esClient, log);
  }
};

export async function ingestSynthtraceDataHook(config: FullConfig, data: SynthtraceIngestionData) {
  const log = getLogger();

  const { apm, infra, otel } = data;
  const hasApmData = apm.length > 0;
  const hasInfraData = infra.length > 0;
  const hasOtelData = otel.length > 0;
  const hasAnyData = hasApmData || hasInfraData || hasOtelData;

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
        const client = await getSynthtraceClient(typedKey, esClient, kbnUrl, scoutConfig.auth, log);

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
