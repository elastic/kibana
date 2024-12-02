/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PlaywrightTestConfig, PlaywrightTestOptions } from 'playwright/test';

export type Protocol = 'http' | 'https';

export const VALID_CONFIG_MARKER = Symbol('validConfig');

export interface ScoutTestOptions extends PlaywrightTestOptions {
  serversConfigDir: string;
  [VALID_CONFIG_MARKER]: boolean;
}

export interface ScoutPlaywrightOptions extends Pick<PlaywrightTestConfig, 'testDir' | 'workers'> {
  testDir: string;
  workers?: 1 | 2;
}
