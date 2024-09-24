/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server as HapiServer } from '@hapi/hapi';
import type { Server as TlsServer } from 'https';
import type { ISslConfig, ServerListener } from './types';
import { getServerTLSOptions } from './get_tls_options';

function isTLSListener(server: ServerListener): server is TlsServer {
  return 'setSecureContext' in server;
}

export const setTlsConfig = (hapiServer: HapiServer, sslConfig: ISslConfig) => {
  const server = hapiServer.listener;
  if (!isTLSListener(server)) {
    throw new Error('tried to set TLS config on a non-TLS http server');
  }
  const tlsOptions = getServerTLSOptions(sslConfig);
  if (!tlsOptions) {
    throw new Error('tried to apply a disabled SSL config');
  }
  server.setSecureContext(tlsOptions);
};
