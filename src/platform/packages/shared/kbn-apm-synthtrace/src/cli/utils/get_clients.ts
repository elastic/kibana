/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Required } from 'utility-types';
import { Client } from '@elastic/elasticsearch';
import { ApmSynthtraceEsClient } from '../../lib/apm/client/apm_synthtrace_es_client';
import { ApmSynthtraceKibanaClient } from '../../lib/apm/client/apm_synthtrace_kibana_client';
import { InfraSynthtraceEsClient } from '../../lib/infra/infra_synthtrace_es_client';
import { LogsSynthtraceEsClient } from '../../lib/logs/logs_synthtrace_es_client';
import { SynthtraceEsClientOptions } from '../../lib/shared/base_client';
import { StreamsSynthtraceClient } from '../../lib/streams/streams_synthtrace_client';
import { SyntheticsSynthtraceEsClient } from '../../lib/synthetics/synthetics_synthtrace_es_client';
import { Logger } from '../../lib/utils/create_logger';

export interface SynthtraceClients {
  apmEsClient: ApmSynthtraceEsClient;
  infraEsClient: InfraSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  streamsClient: StreamsSynthtraceClient;
  syntheticsEsClient: SyntheticsSynthtraceEsClient;
  esClient: Client;
}

export async function getClients({
  logger,
  options,
  packageVersion,
  skipBootstrap,
}: {
  logger: Logger;
  options: Required<Omit<SynthtraceEsClientOptions, 'pipeline'>, 'kibana'>;
  packageVersion?: string;
  skipBootstrap?: boolean;
}): Promise<SynthtraceClients> {
  const apmKibanaClient = new ApmSynthtraceKibanaClient({
    logger,
    kibanaClient: options.kibana,
  });

  let version = packageVersion;

  if (!version) {
    version = await apmKibanaClient.fetchLatestApmPackageVersion();
    if (!skipBootstrap) {
      await apmKibanaClient.installApmPackage(version);
    }
  } else if (version === 'latest') {
    version = await apmKibanaClient.fetchLatestApmPackageVersion();
  }

  logger.debug(`Using package version: ${version}`);

  const apmEsClient = new ApmSynthtraceEsClient({
    ...options,
    version,
  });

  const logsEsClient = new LogsSynthtraceEsClient(options);
  const infraEsClient = new InfraSynthtraceEsClient(options);

  const syntheticsEsClient = new SyntheticsSynthtraceEsClient(options);

  const streamsClient = new StreamsSynthtraceClient(options);

  return {
    apmEsClient,
    infraEsClient,
    logsEsClient,
    streamsClient,
    syntheticsEsClient,
    esClient: options.client,
  };
}
