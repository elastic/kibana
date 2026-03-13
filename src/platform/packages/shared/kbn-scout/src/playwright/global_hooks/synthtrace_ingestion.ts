/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FullConfig } from 'playwright/test';
import { Readable } from 'node:stream';
import type {
  ApmFields,
  ApmOtelFields,
  Fields,
  InfraDocument,
  Serializable,
  SynthtraceGenerator,
} from '@kbn/synthtrace-client';
import type { SynthtraceClientTypes } from '@kbn/synthtrace';
import { createScoutConfig, measurePerformanceAsync, getEsClient } from '../../common';
import { ScoutLogger } from '../../common/services/logger';
import type { ScoutTestOptions } from '../types';
import { getSynthtraceClient } from '../../common/services/synthtrace';

export type SynthtraceEvents<T extends Fields> = SynthtraceGenerator<T> | Array<Serializable<T>>;

interface SynthtraceIngestionData {
  apm: Array<SynthtraceEvents<ApmFields | ApmOtelFields>>;
  infra: Array<SynthtraceEvents<InfraDocument>>;
}

const indexSynthtraceEvents = async <
  TFields extends Fields,
  TClient extends SynthtraceClientTypes
>({
  client,
  event,
}: {
  client: Awaited<ReturnType<typeof getSynthtraceClient<TClient>>>[TClient];
  event: SynthtraceEvents<TFields>;
}) => {
  return client.index(Readable.from(Array.from(event)));
};

/**
 * @deprecated Use `globalSetupHook` and synthtrace fixtures instead
 */
export async function ingestSynthtraceDataHook(config: FullConfig, data: SynthtraceIngestionData) {
  const log = new ScoutLogger('scout: global hook');

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

    for (const typedKey of Object.keys(data) as Array<keyof SynthtraceIngestionData>) {
      if (typedKey === 'apm') {
        if (data.apm.length === 0) {
          log.debug('[setup] no synthtrace data to ingest for apm');
          continue;
        }

        const clients = await getSynthtraceClient('apmEsClient', {
          esClient,
          kbnUrl,
          log,
          config: scoutConfig,
        });

        log.debug('[setup] ingesting apm synthtrace data');

        try {
          await Promise.all(
            data.apm.map((event) => {
              return indexSynthtraceEvents({
                client: clients.apmEsClient,
                event,
              });
            })
          );
        } catch (e) {
          log.debug('[setup] error ingesting apm synthtrace data', e);
        }

        log.debug('[setup] apm synthtrace data ingested successfully');
        continue;
      }

      if (data.infra.length === 0) {
        log.debug('[setup] no synthtrace data to ingest for infra');
        continue;
      }

      const clients = await getSynthtraceClient('infraEsClient', {
        esClient,
        kbnUrl,
        log,
        config: scoutConfig,
      });

      log.debug('[setup] ingesting infra synthtrace data');

      try {
        await Promise.all(
          data.infra.map((event) => {
            return indexSynthtraceEvents({
              client: clients.infraEsClient,
              event,
            });
          })
        );
      } catch (e) {
        log.debug('[setup] error ingesting infra synthtrace data', e);
      }

      log.debug('[setup] infra synthtrace data ingested successfully');
    }
  });
}
