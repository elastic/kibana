/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * True when CI enabled FIPS for this run, reading the same `TEST_ENABLE_FIPS_VERSION` signal as
 * `fipsIsEnabled` in `@kbn/test`; interactive setup regenerates `kibana.yml` without
 * `xpack.security.fipsMode.enabled`, so the rebooted FIPS-enabled Node exits fatally (code 78).
 */
export const isFipsEnabled = (): boolean =>
  /(140-2|140-3)/.test(process.env.TEST_ENABLE_FIPS_VERSION ?? '');
