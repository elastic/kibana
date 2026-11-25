/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) {
  throw new Error('TEST_RUN_ID is required for the legacy log stream data namespace');
}

const legacyLogStreamDataStream = `logs-synth.discover-${testRunId}`;

globalTeardownHook(
  'Teardown legacy log stream embeddable data',
  { tag: '@local-stateful-classic' },
  async ({ esClient, log }) => {
    log.debug(`[teardown:legacy_log_stream] deleting ${legacyLogStreamDataStream}...`);
    await esClient.indices.deleteDataStream({ name: legacyLogStreamDataStream }, { ignore: [404] });
    log.debug('[teardown:legacy_log_stream] synthtrace logs deleted');
  }
);
