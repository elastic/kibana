/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Whether the test process runs against a FIPS-enabled build. Mirrors `fipsIsEnabled` from
 * `@kbn/test` (read directly, like `KIBANA_SYSTEM_USER` in `constants.ts`, to avoid pulling the
 * FTR server-management graph into the Scout workers).
 */
export const isFipsEnabled = (): boolean =>
  Boolean(process.env.TEST_ENABLE_FIPS_VERSION?.match(/(140-2|140-3)/));
