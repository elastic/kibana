/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { getLogger } from '../../../../common/services';
import { ScoutLogger } from '../../../../common';

/**
 * Provides a scoped logger instance for each worker. This logger is shared across
 * all other fixtures within the worker scope.
 */
export const logFixture = base.extend<
  {},
  {
    log: ScoutLogger;
  }
>({
  log: [
    ({}, use) => {
      use(getLogger('scout'));
    },
    { scope: 'worker' },
  ],
});
