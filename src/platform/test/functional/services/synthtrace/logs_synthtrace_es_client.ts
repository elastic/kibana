/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLogger, LogLevel, getSynthtraceClients } from '@kbn/apm-synthtrace';

import { FtrProviderContext } from '../../ftr_provider_context';

export function LogSynthtraceEsClientProvider({ getService }: FtrProviderContext) {
  const esClient = getService('es');

  const getSynthtraceClientsFn = () =>
    getSynthtraceClients({
      options: {
        logger: createLogger(LogLevel.info),
        client: esClient,
        refreshAfterIndex: true,
        includePipelineSerialization: false,
      },
      synthClients: ['logsEsClient'],
    });

  return {
    async getClient() {
      const { logsEsClient } = await getSynthtraceClientsFn();
      return logsEsClient;
    },
  };
}
