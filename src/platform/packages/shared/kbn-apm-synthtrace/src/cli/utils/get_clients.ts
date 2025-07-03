/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { castArray } from 'lodash';
import { ApmSynthtraceEsClient } from '../../lib/apm/client/apm_synthtrace_es_client';
import { InfraSynthtraceEsClient } from '../../lib/infra/infra_synthtrace_es_client';
import { LogsSynthtraceEsClient } from '../../lib/logs/logs_synthtrace_es_client';
import { SynthtraceEsClientOptions } from '../../lib/shared/base_client';
import { StreamsSynthtraceClient } from '../../lib/streams/streams_synthtrace_client';
import { SyntheticsSynthtraceEsClient } from '../../lib/synthetics/synthetics_synthtrace_es_client';

export interface PipelineOptions {
  includePipelineSerialization?: boolean;
}

type DefaultSynthtraceClients = [
  'apmEsClient',
  'infraEsClient',
  'logsEsClient',
  'syntheticsEsClient',
  'streamsClient'
];

interface SynthtraceClientInstanceMap {
  apmEsClient: ApmSynthtraceEsClient;
  infraEsClient: InfraSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  syntheticsEsClient: SyntheticsSynthtraceEsClient;
  streamsClient: StreamsSynthtraceClient;
}

export type SynthtraceClientTypes = DefaultSynthtraceClients[number];

export interface SynthtraceClients extends SynthtraceClientInstanceMap {
  esClient: Client;
}

interface GetClientsOptions<K extends SynthtraceClientTypes = SynthtraceClientTypes> {
  options: Omit<SynthtraceEsClientOptions, 'pipeline'> & PipelineOptions;
  packageVersion?: string;
  skipBootstrap?: boolean;
  synthClients?: K | K[];
}

export type GetClientsReturn<K extends SynthtraceClientTypes = SynthtraceClientTypes> = Pick<
  SynthtraceClientInstanceMap,
  K
> & {
  esClient: Client;
};

export async function getSynthtraceClients<
  const K extends SynthtraceClientTypes = SynthtraceClientTypes
>(opts: GetClientsOptions<K>): Promise<GetClientsReturn<K>> {
  const {
    options,
    packageVersion,
    skipBootstrap = true,
    synthClients = [
      'apmEsClient',
      'infraEsClient',
      'logsEsClient',
      'syntheticsEsClient',
      'streamsClient',
    ],
  } = opts;

  const version = packageVersion;

  const result = {
    esClient: options.client,
  } as GetClientsReturn<K>;

  const factories: Record<
    SynthtraceClientTypes,
    () => Promise<SynthtraceClientInstanceMap[SynthtraceClientTypes]>
  > = {
    apmEsClient: async () => {
      const client = new ApmSynthtraceEsClient({ ...options, version });
      if (!skipBootstrap) {
        await client.initializePackage();
      }
      return client;
    },
    infraEsClient: async () => {
      const client = new InfraSynthtraceEsClient(options);
      if (!skipBootstrap) {
        await client.initializePackage();
      }
      return client;
    },
    logsEsClient: async () => Promise.resolve(new LogsSynthtraceEsClient(options)),
    syntheticsEsClient: async () => Promise.resolve(new SyntheticsSynthtraceEsClient(options)),
    streamsClient: async () => {
      if (!options.kibana) {
        throw new Error('Kibana client is required for StreamsSynthtraceClient');
      }

      return Promise.resolve(new StreamsSynthtraceClient({ ...options, kibana: options.kibana }));
    },
  };

  for (const key of castArray(synthClients)) {
    const initClient = factories[key];
    (result as any)[key] = await initClient();
  }
  return result;
}
