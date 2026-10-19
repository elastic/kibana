/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPlaywrightConfig } from '@kbn/scout';

// Runs the grid benchmark against the react-data-grid proof of concept; the `discover_rdg_grid`
// server config set switches the grid, so the spec is shared, not copied.
export default createPlaywrightConfig({
  testDir: '../../../scout/grid_performance/ui/tests',
  workers: 1,
});
