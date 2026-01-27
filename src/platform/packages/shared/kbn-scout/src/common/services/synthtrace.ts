/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Url from 'url';
import type { SynthtraceClientTypes, GetClientsReturn } from '@kbn/synthtrace';
import { LogLevel, createLogger, SynthtraceClientsManager } from '@kbn/synthtrace';
import type { Client } from '@elastic/elasticsearch';
import type { ScoutLogger } from './logger';
import type { ScoutTestConfig } from '../../types';

export interface SynthtraceClientOptions {
  kbnUrl?: string;

  esClient: Client;

  log: ScoutLogger;

  config: ScoutTestConfig;
}

const buildUrlWithAuth = (kbnUrl: string, config: ScoutTestConfig) => {
  const { username, password } = config.auth;
  const kibanaUrl = new URL(kbnUrl);
  return Url.format({
    protocol: kibanaUrl.protocol,
    hostname: kibanaUrl.hostname,
    port: kibanaUrl.port,
    auth: `${username}:${password}`,
  });
};

const instantiatedClients: Record<
  string,
  GetClientsReturn<SynthtraceClientTypes>[SynthtraceClientTypes]
> = {};
export async function getSynthtraceClient<
  TClient extends SynthtraceClientTypes = SynthtraceClientTypes
>(
  synthClient: TClient,
  { esClient, kbnUrl, log, config }: SynthtraceClientOptions,
  overrides: { skipInstallation?: boolean } = {}
): Promise<GetClientsReturn<TClient>> {
  if (instantiatedClients[synthClient]) {
    return instantiatedClients[synthClient] as unknown as GetClientsReturn<TClient>;
  }

  const kibanaTarget = kbnUrl ? buildUrlWithAuth(kbnUrl, config) : undefined;

  const clientManager = new SynthtraceClientsManager({
    client: esClient,
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: true,
    concurrency: 4, // set a default concurrency to allign with EsArchiver
  });

  const clients = clientManager.getClients({
    clients: [synthClient],
    kibana: kibanaTarget
      ? {
          target: kibanaTarget.toString(),
          logger: createLogger(LogLevel.debug),
        }
      : undefined,
  });

  await clientManager.initFleetPackageForClient({
    clients,
    skipInstallation: overrides.skipInstallation ?? false,
  });

  if (overrides.skipInstallation) {
    log.serviceMessage(
      synthClient,
      'Skipped fleet package installation because "overrides.skipInstallation" is true'
    );
  }

  log.serviceLoaded(synthClient);

  instantiatedClients[synthClient] = clients[synthClient];

  return instantiatedClients as GetClientsReturn<TClient>;
}
