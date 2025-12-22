/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import type { ApmSynthtraceEsClient } from '../../lib/apm/client/apm_synthtrace_es_client';
import { ApmSynthtraceEsClientImpl } from '../../lib/apm/client/apm_synthtrace_es_client';
import type { InfraSynthtraceEsClient } from '../../lib/infra/infra_synthtrace_es_client';
import { InfraSynthtraceEsClientImpl } from '../../lib/infra/infra_synthtrace_es_client';
import type { LogsSynthtraceEsClient } from '../../lib/logs/logs_synthtrace_es_client';
import { LogsSynthtraceEsClientImpl } from '../../lib/logs/logs_synthtrace_es_client';
import type { SynthtraceEsClientOptions } from '../../lib/shared/base_client';
import type { SyntheticsSynthtraceEsClient } from '../../lib/synthetics/synthetics_synthtrace_es_client';
import { SyntheticsSynthtraceEsClientImpl } from '../../lib/synthetics/synthetics_synthtrace_es_client';
import type { StreamsSynthtraceClient } from '../../lib/streams/streams_synthtrace_client';
import { StreamsSynthtraceClientImpl } from '../../lib/streams/streams_synthtrace_client';
import type { PackageManagement } from '../../lib/shared/types';

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

export interface SynthtraceClients {
  apmEsClient: ApmSynthtraceEsClient;
  infraEsClient: InfraSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  syntheticsEsClient: SyntheticsSynthtraceEsClient;
  streamsClient: StreamsSynthtraceClient;
}

export type SynthtraceClientsWithFleetPackage = {
  [K in keyof SynthtraceClients]: SynthtraceClients[K] extends PackageManagement ? K : never;
}[keyof SynthtraceClients];

export type SynthtraceClientTypes = DefaultSynthtraceClients[number];
export type GetClientsReturn<K extends SynthtraceClientTypes = SynthtraceClientTypes> = Pick<
  SynthtraceClients,
  K
>;

export class SynthtraceClientsManager {
  constructor(
    private readonly options: Omit<
      SynthtraceEsClientOptions,
      'pipeline' | 'fleetClient' | 'kibana'
    > &
      PipelineOptions
  ) {}
  getClients<const TClient extends SynthtraceClientTypes = SynthtraceClientTypes>(
    opts?: {
      clients?: TClient[];
      packageVersion?: string;
    } & Pick<SynthtraceEsClientOptions, 'kibana'>
  ): GetClientsReturn<TClient> {
    const { kibana, packageVersion } = opts ?? {};

    const factories: Record<SynthtraceClientTypes, () => SynthtraceClients[SynthtraceClientTypes]> =
      {
        apmEsClient: () =>
          new ApmSynthtraceEsClientImpl({
            ...this.options,
            version: packageVersion,
            kibana,
          }),
        infraEsClient: () => new InfraSynthtraceEsClientImpl({ ...this.options, kibana }),
        logsEsClient: () => new LogsSynthtraceEsClientImpl({ ...this.options, kibana }),
        syntheticsEsClient: () => new SyntheticsSynthtraceEsClientImpl({ ...this.options, kibana }),
        streamsClient: () => {
          if (!kibana) {
            throw new Error('Kibana client is required for StreamsSynthtraceClient');
          }

          return new StreamsSynthtraceClientImpl({ ...this.options, kibana });
        },
      };

    const clientsToInitialize = opts?.clients
      ? castArray(opts.clients)
      : (Object.keys(factories) as SynthtraceClientTypes[]);

    return clientsToInitialize.reduce((acc, key) => {
      const initFn = factories[key];
      if (!initFn) {
        throw new Error(`Client factory for ${key} is not defined`);
      }

      (acc as any)[key] = initFn();

      return acc;
    }, {} as GetClientsReturn<TClient>);
  }

  async initFleetPackageForClient<
    TClient extends SynthtraceClientTypes = SynthtraceClientsWithFleetPackage
  >(opts: {
    clients: Partial<GetClientsReturn<TClient>>;
    version?: string;
    skipInstallation?: boolean;
  }): Promise<Record<TClient, string | undefined>> {
    const { clients, version, skipInstallation } = opts;

    if (!clients) {
      throw new Error('No clients have been initialized. Call getClients() first.');
    }

    const result: Record<string, string | undefined> = {};

    for (const [key, client] of Object.entries(clients)) {
      if (this.isClientWithPackageManangement(client)) {
        result[key] = await client.initializePackage({ version, skipInstallation });
      }
    }

    return result;
  }

  private isClientWithPackageManangement(client: unknown): client is PackageManagement {
    return 'initializePackage' in (client as PackageManagement);
  }
}
