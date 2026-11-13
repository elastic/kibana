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
 * Sequential config for tests that depend on sample data.
 *
 * Sample data cannot be installed per space in parallel. The dashboard, map and data view saved
 * objects are multi-namespace types, so their ids are unique across the whole cluster. If the sample
 * data is already installed in another space, the importer regenerates the ids of the new copies.
 * That breaks anything that relies on the fixed sample data ids (legacy urls, short urls, etc.).
 *
 * To keep the original ids, the tests in `tests` run in a single worker against the default space.
 * Sample data is installed once in global setup and removed in global teardown.
 */
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
  runGlobalSetup: true,
});
