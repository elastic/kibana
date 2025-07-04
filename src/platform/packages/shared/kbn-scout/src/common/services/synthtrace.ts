/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LogLevel,
  SynthtraceClientTypes,
  createLogger,
  SynthtraceClientsManager,
} from '@kbn/apm-synthtrace';
import { Client } from '@elastic/elasticsearch';
import { ScoutLogger } from './logger';

export interface SynthtraceClientOptions {
  kbnUrl?: string;

  esClient: Client;

  log: ScoutLogger;
}

const logger = createLogger(LogLevel.info);

export async function getSynthtraceClient(
  synthClient: SynthtraceClientTypes,
  { esClient, kbnUrl, log }: SynthtraceClientOptions
) {
  const clientManager = new SynthtraceClientsManager({
    client: esClient,
    logger,
    refreshAfterIndex: true,
    includePipelineSerialization: false,
  });

  const client = clientManager.getClients({
    clients: [synthClient],
    kibana: kbnUrl
      ? {
          target: kbnUrl,
        }
      : undefined,
  });

  log.serviceLoaded(synthClient);

  return client[synthClient];
}
