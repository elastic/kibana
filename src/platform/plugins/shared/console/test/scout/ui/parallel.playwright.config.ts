/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPlaywrightConfig } from '@kbn/scout';

// These suites don't ingest Elasticsearch data and keep their state in the browser
// (localStorage) or the worker's own space, so they can run in parallel. Suites that
// create indices, pipelines or sample data stay in the sequential `./tests` config.
export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 3,
});
