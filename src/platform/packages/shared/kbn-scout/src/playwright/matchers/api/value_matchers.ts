/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import type { ValueMatchers } from './types';

/**
 * Create value matchers delegating to Playwright expect
 */
export function createValueMatchers(actual: unknown): ValueMatchers {
  // eslint-disable-next-line playwright/valid-expect
  const base = baseExpect(actual);
  return {
    toBeDefined: () => base.toBeDefined(),
    not: {
      toBeDefined: () => base.not.toBeDefined(),
    },
  };
}
