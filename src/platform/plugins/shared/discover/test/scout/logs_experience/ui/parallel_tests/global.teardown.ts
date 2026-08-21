/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';
import { LOGS } from '../fixtures';

globalTeardownHook('Teardown logs experience tests data', async ({ esClient, log }) => {
  await esClient.indices
    .deleteDataStream({ name: `logs-${LOGS.SYNTH_LOGS_DATASET}-${LOGS.SYNTH_LOGS_NAMESPACE}` })
    .then(() =>
      log.debug(
        `[teardown:logs] Deleted logs-${LOGS.SYNTH_LOGS_DATASET}-${LOGS.SYNTH_LOGS_NAMESPACE} data stream`
      )
    )
    .catch((err: Error) =>
      log.warning(`[teardown:logs] Failed to delete logs data stream: ${err.message}`)
    );

  // cpu, memory and network each land in their own metrics-system.* data stream.
  await esClient.indices
    .deleteDataStream({ name: 'metrics-system.*' })
    .then(() => log.debug('[teardown:logs] Deleted metrics-system.* data streams'))
    .catch((err: Error) =>
      log.warning(`[teardown:logs] Failed to delete metrics-system.* data streams: ${err.message}`)
    );
});
