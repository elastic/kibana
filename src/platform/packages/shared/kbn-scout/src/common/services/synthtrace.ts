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
  getSynthtraceClients,
} from '@kbn/apm-synthtrace';
import { Client } from '@elastic/elasticsearch';

export interface SynthtraceClientOptions {
  kbnUrl?: string;

  esClient: Client;
}

const logger = createLogger(LogLevel.info);

export async function getSynthtraceClient(
  type: SynthtraceClientTypes,
  { esClient, kbnUrl }: SynthtraceClientOptions
) {
  const client = await getSynthtraceClients({
    options: {
      client: esClient,
      kibana: kbnUrl
        ? {
            target: kbnUrl,
          }
        : undefined,
      logger,
      refreshAfterIndex: true,
      includePipelineSerialization: false,
    },
    synthClients: type,
    skipBootstrap: false,
  });

  return client[type];
}
