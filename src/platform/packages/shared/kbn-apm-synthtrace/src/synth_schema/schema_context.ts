/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import { SynthtraceClientsManager, createLogger, LogLevel } from '../..';
import { getKibanaClient } from '../cli/utils/get_kibana_client';
import { getServiceUrls } from '../cli/utils/get_service_urls';
import { getEsClientTlsSettings } from '../cli/utils/ssl';

export async function createSchemaContext(argv: any) {
  const logLevel = argv.debug ? LogLevel.debug : argv.verbose ? LogLevel.verbose : LogLevel.info;
  const logger = createLogger(logLevel);

  const { kibanaUrl, esUrl } = await getServiceUrls({ ...argv, logger, files: [] });

  const kibanaClient = getKibanaClient({
    target: kibanaUrl,
    apiKey: argv.apiKey,
    logger,
  });

  const esClient = new Client({
    node: esUrl,
    ...(argv.apiKey && { auth: { apiKey: argv.apiKey } }),
    tls: getEsClientTlsSettings(esUrl, argv.insecure),
    Connection: HttpConnection,
    requestTimeout: 30_000,
  });

  const clientManager = new SynthtraceClientsManager({
    client: esClient,
    logger,
    concurrency: argv.concurrency,
  });

  const clients = clientManager.getClients({
    kibana: kibanaClient,
  });

  return { logger, clients };
}
