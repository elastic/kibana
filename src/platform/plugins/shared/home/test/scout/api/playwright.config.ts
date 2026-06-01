/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Start server (terminal 1):
//   node scripts/scout.js start-server --arch stateful --domain classic
//
// Run tests against running server (terminal 2):
//   SCOUT_TARGET_LOCATION=local SCOUT_TARGET_ARCH=stateful SCOUT_TARGET_DOMAIN=classic \
//   node_modules/.bin/playwright test \
//   --config=src/platform/plugins/shared/home/test/scout/api/playwright.config.ts \
//   --grep=@local-stateful-classic --project=local

import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});
