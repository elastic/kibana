/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * The `scout_discover_context_awareness` directory name is load-bearing: Scout derives the server
 * config set from it, and that set is what starts Kibana with the example context awareness
 * profiles registered via `--discover.experimental.enabledProfiles`. Renaming the directory
 * silently falls back to the `default` set, where none of the example profiles resolve.
 *
 * Needing that set also makes this suite local-only. A config set is a set of server args, and a
 * cloud run attaches to an already-provisioned deployment instead of starting a server, so the
 * profiles cannot be enabled there — the `@cloud-*` half of the deployment tags the specs carry is
 * inert whatever CI decides to schedule.
 */
export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});
