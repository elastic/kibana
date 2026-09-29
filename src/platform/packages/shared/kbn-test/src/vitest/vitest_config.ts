/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename } from 'path';

/** File name of a unit test group config; unit tests run on Vitest, integration tests on Jest. */
export const VITEST_CONFIG_NAME = 'vitest.config.js';

export const isVitestConfig = (configPath: string): boolean =>
  basename(configPath) === VITEST_CONFIG_NAME;
