/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraCache, InfraLogType } from '../../constants';

export const CACHE: Record<InfraCache, Record<InfraLogType['cache'], string[]>> = {
  redis: {
    healthy: [
      `1:M {timestamp} * 100 changes in 300 seconds. Saving...`,
      `118:C {timestamp} * DB saved on disk`,
      `1:M {timestamp} * Background saving terminated with success`,
      `1:M {timestamp} * Ready to accept connections tcp`,
    ],
    eviction: [
      `1:M {timestamp} # OOM command not allowed when used memory > 'maxmemory'.`,
      `1:M {timestamp} # WARNING: Can't save in background: fork: Cannot allocate memory`,
    ],
    connection_error: [
      `1:M {timestamp} # Connection from {db_host} closed: Connection reset by peer`,
      `1:M {timestamp} # Error accepting a client connection: accept: Too many open files in system`,
    ],
  },
};
