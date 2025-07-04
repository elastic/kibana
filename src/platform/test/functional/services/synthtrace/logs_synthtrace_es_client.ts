/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLogger, LogLevel, SynthtraceClientsManager } from '@kbn/apm-synthtrace';

import { FtrProviderContext } from '../../ftr_provider_context';

export function LogSynthtraceEsClientProvider({ getService }: FtrProviderContext) {
  const esClient = getService('es');

  const clientManager = new SynthtraceClientsManager({
    client: esClient,
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: true,
  });

  const { logsEsClient } = clientManager.getClients({
    clients: ['logsEsClient'],
  });

  return logsEsClient;
}
