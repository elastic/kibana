/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { convertSecurityApi } from './convert_security_api';
export { getDefaultSecurityImplementation } from './default_implementation';

export interface SecurityServiceConfigType {
  fipsMode?: {
    enabled: boolean;
  };
  uiam?: { enabled: false } | { enabled: true; sharedSecret: string };
}

export interface PKCS12ConfigType {
  ssl?: {
    keystore?: {
      path?: string;
    };
    truststore?: {
      path?: string;
    };
  };
}
