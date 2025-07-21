/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SynthtraceClientTypes, SynthtraceClientsManager } from '@kbn/apm-synthtrace';
import { ToolingLog } from '@kbn/tooling-log';
import { type Logger, extendToolingLog } from '@kbn/apm-synthtrace';
import { Auth, Es } from '.';
import { KibanaUrl } from './kibana_url';

export interface SynthtraceClientOptions {
  kbnUrl: KibanaUrl;
  auth: Auth;
  es: Es;
  log: ToolingLog;
}

export type SynthtraceDataType = 'infra' | 'apm';

const synthtraceClientMapping: Record<SynthtraceDataType, SynthtraceClientTypes> = {
  infra: 'infraEsClient',
  apm: 'apmEsClient',
};

export async function getSynthtraceClient(
  synthClient: SynthtraceDataType,
  options: SynthtraceClientOptions
) {
  const { log, es, auth, kbnUrl } = options;
  const logger: Logger = extendToolingLog(log);

  const clientType = synthtraceClientMapping[synthClient];
  if (!clientType) {
    throw new Error(`Unsupported synthtrace client type: ${synthClient}`);
  }

  const clientManager = new SynthtraceClientsManager({
    client: es,
    logger,
    refreshAfterIndex: true,
    includePipelineSerialization: synthClient !== 'apm', // Only include pipeline serialization for APM client
  });

  const clients = clientManager.getClients({
    clients: [clientType],
    kibana: {
      target: kbnUrl.get(),
      username: auth.getUsername(),
      password: auth.getPassword(),
      logger,
    },
  });

  await clientManager.initFleetPackageForClient({ clients, skipInstallation: false });

  return clients[clientType];
}
