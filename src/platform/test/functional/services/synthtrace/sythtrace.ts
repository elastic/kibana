/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UrlObject } from 'url';
import { format } from 'url';
import type { SynthtraceClientTypes, GetClientsReturn } from '@kbn/synthtrace';
import { createLogger, LogLevel, SynthtraceClientsManager } from '@kbn/synthtrace';
import type { FtrProviderContext } from '@kbn/ftr-common-functional-services';

export function SynthtraceClientProvider({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const config = getService('config');
  const servers = config.get('servers');

  const kibanaServer = servers.kibana as UrlObject;
  const kibanaServerUrlWithAuth = format(kibanaServer);

  return {
    getClients<TClient extends SynthtraceClientTypes>(
      synthtraceClients: TClient[]
    ): GetClientsReturn<TClient> {
      const clientManager = new SynthtraceClientsManager({
        client: esClient,
        logger: createLogger(LogLevel.info),
        refreshAfterIndex: true,
      });

      const clients = clientManager.getClients({
        clients: synthtraceClients,
        kibana: {
          target: kibanaServerUrlWithAuth,
          logger: createLogger(LogLevel.debug),
        },
      });

      return clients;
    },
  };
}
