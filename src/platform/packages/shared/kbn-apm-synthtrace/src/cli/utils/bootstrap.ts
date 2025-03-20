/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import { setIdGeneratorStrategy } from '@kbn/apm-synthtrace-client';
import { createLogger } from '../../lib/utils/create_logger';
import { getClients } from './get_clients';
import { getKibanaClient } from './get_kibana_client';
import { getServiceUrls } from './get_service_urls';
import { RunOptions } from './parse_run_cli_flags';
import { getEsClientTlsSettings } from './ssl';

export async function bootstrap({
  skipClientBootstrap,
  ...runOptions
}: RunOptions & { skipClientBootstrap?: boolean }) {
  const logger = createLogger(runOptions.logLevel);
  setIdGeneratorStrategy(runOptions.uniqueIds ? 'random' : 'sequential');

  const { kibanaUrl, esUrl } = await getServiceUrls({ ...runOptions, logger });

  const kibanaClient = getKibanaClient({
    target: kibanaUrl,
    logger,
  });

  const client = new Client({
    node: esUrl,
    tls: getEsClientTlsSettings(esUrl),
    Connection: HttpConnection,
    requestTimeout: 30_000,
  });

  const clients = await getClients({
    logger,
    packageVersion: runOptions['assume-package-version'],
    options: {
      client,
      logger,
      concurrency: runOptions.concurrency,
      kibana: kibanaClient,
    },
    skipBootstrap: skipClientBootstrap,
  });

  if (runOptions.clean) {
    for (const synthtraceClient of Object.values(clients)) {
      if ('clean' in synthtraceClient) {
        await synthtraceClient.clean();
      }
    }
  }

  return {
    clients,
    logger,
    kibanaUrl,
    esUrl,
  };
}
