/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConfigDeprecationProvider } from '@kbn/core/server';

const level = 'warning';

export const configDeprecationProvider: ConfigDeprecationProvider = ({
  renameFromRoot,
  unusedFromRoot,
  deprecateFromRoot,
}) => [
  renameFromRoot('xpack.data_enhanced.search.sessions', 'data.search.sessions', {
    level,
  }),
  unusedFromRoot('data.search.sessions.pageSize', { level }),
  unusedFromRoot('data.search.sessions.trackingInterval', { level }),
  unusedFromRoot('data.search.sessions.cleanupInterval', { level }),
  unusedFromRoot('data.search.sessions.expireInterval', { level }),
  unusedFromRoot('data.search.sessions.monitoringTaskTimeout', { level }),
  unusedFromRoot('data.search.sessions.notTouchedInProgressTimeout', { level }),

  // Search sessions config deprecations
  deprecateFromRoot('data.search.sessions.enabled', '9.1.0', { level }),
  deprecateFromRoot('data.search.sessions.notTouchedTimeout', '9.1.0', { level }),
  deprecateFromRoot('data.search.sessions.maxUpdateRetries', '9.1.0', { level }),
  deprecateFromRoot('data.search.sessions.defaultExpiration', '9.1.0', { level }),
  deprecateFromRoot('data.search.sessions.management.maxSessions', '9.1.0', { level }),
  deprecateFromRoot('data.search.sessions.management.refreshInterval', '9.1.0', { level }),
  deprecateFromRoot('data.search.sessions.management.refreshTimeout', '9.1.0', { level }),
  deprecateFromRoot('data.search.sessions.management.expiresSoonWarning', '9.1.0', { level }),
];
