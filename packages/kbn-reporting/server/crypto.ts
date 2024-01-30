/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import nodeCrypto from '@elastic/node-crypto';

export function cryptoFactory(encryptionKey?: string) {
  if (typeof encryptionKey !== 'string') {
    throw new Error('Encryption Key required.');
  }

  return nodeCrypto({ encryptionKey });
}
