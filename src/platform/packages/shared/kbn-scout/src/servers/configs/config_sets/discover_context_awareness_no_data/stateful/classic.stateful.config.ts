/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { discoverContextAwarenessServerArgs } from '../../discover_context_awareness/shared';

/**
 * Same server as the `discover_context_awareness` set, but its own lane so the cluster stays empty:
 * the suite it serves asserts that Discover shows its onboarding page when there is no data, which
 * only holds if nothing has ingested any. Sibling suites in the main lane load ES archives during
 * global setup, so this cannot share with them.
 *
 * Consequently the test directory for this set must never load an archive.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...discoverContextAwarenessServerArgs],
  },
};
