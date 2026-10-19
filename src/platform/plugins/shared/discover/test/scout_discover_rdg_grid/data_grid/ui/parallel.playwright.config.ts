/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPlaywrightConfig } from '@kbn/scout';

// Re-runs the Discover data grid suite against the react-data-grid proof of concept. The server config set
// `discover_rdg_grid` switches the default grid, so the specs are shared, not copied.
export default createPlaywrightConfig({
  testDir: '../../../scout/data_grid/ui/parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});
