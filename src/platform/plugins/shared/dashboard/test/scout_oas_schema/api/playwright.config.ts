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
 * Playwright config for OAS schema validation tests.
 *
 * These tests use a custom server configuration that enables the OAS endpoint.
 * The custom config is located at:
 * src/platform/packages/shared/kbn-scout/src/servers/configs/custom/oas_schema/
 *
 * See README.md for usage instructions.
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
