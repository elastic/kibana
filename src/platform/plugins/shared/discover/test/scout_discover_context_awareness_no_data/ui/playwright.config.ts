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
 * The `scout_discover_context_awareness_no_data` directory name is load-bearing: Scout derives the
 * server config set from it, and that set is what registers the example context awareness profiles
 * while keeping this lane's cluster empty.
 *
 * Nothing here may load an ES or Kibana archive — the suite asserts Discover's onboarding page,
 * which only appears while no data exists anywhere in the cluster.
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
