/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ServerOptions as TLSOptions } from 'https';
import { ISslConfig } from './types';

/**
 * Converts Kibana `SslConfig` into `TLSOptions` that are accepted by the Hapi server,
 * and by https.Server.setSecureContext()
 */
export function getServerTLSOptions(ssl: ISslConfig): TLSOptions | undefined {
  if (!ssl.enabled) {
    return undefined;
  }
  return {
    ca: ssl.certificateAuthorities,
    cert: ssl.certificate,
    ciphers: ssl.cipherSuites?.join(':'),
    // We use the server's cipher order rather than the client's to prevent the BEAST attack.
    honorCipherOrder: true,
    key: ssl.key,
    passphrase: ssl.keyPassphrase,
    secureOptions: ssl.getSecureOptions ? ssl.getSecureOptions() : undefined,
    requestCert: ssl.requestCert,
    rejectUnauthorized: ssl.rejectUnauthorized,
  };
}
