/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setupLogging, setupLoggingRotate } from '@kbn/legacy-logging';

export async function loggingMixin(kbnServer, server, config) {
  const loggingConfig = config.get('logging');
  const opsInterval = config.get('ops.interval');

  await setupLogging(server, loggingConfig, opsInterval);
  await setupLoggingRotate(server, loggingConfig);
}
