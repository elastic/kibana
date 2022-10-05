/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ConfigDeprecationProvider } from '@kbn/core/server';

export const configDeprecationProvider: ConfigDeprecationProvider = ({
  renameFromRoot,
  unusedFromRoot,
}) => [
  renameFromRoot('xpack.data_enhanced.search.sessions', 'data.search.sessions', {
    level: 'warning',
  }),
  unusedFromRoot('data.search.sessions.pageSize', { level: 'warning' }),
  unusedFromRoot('data.search.sessions.trackingInterval', { level: 'warning' }),
  unusedFromRoot('data.search.sessions.cleanupInterval', { level: 'warning' }),
  unusedFromRoot('data.search.sessions.expireInterval', { level: 'warning' }),
  unusedFromRoot('data.search.sessions.monitoringTaskTimeout', { level: 'warning' }),
  unusedFromRoot('data.search.sessions.notTouchedInProgressTimeout', { level: 'warning' }),
];
