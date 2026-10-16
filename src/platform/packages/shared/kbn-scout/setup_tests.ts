/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// FIPS CI agents export SCOUT_TARGET_ATTRIBUTES=fips, which `resolveTargetAttributes` falls back to
// whenever `--targetAttribute` yields no values. Suites must declare attributes explicitly instead.
delete process.env.SCOUT_TARGET_ATTRIBUTES;
