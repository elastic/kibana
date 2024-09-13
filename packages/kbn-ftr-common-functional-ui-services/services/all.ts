/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RetryOnStaleProvider } from './retry_on_stale';
import { RemoteProvider } from './remote';
import { FindProvider } from './find';
import { TestSubjects } from './test_subjects';
import { BrowserProvider } from './browser';
import { ToastsService } from './toasts';
import { SecurityServiceProvider } from './security';

export const services = {
  retryOnStale: RetryOnStaleProvider,
  __webdriver__: RemoteProvider,
  find: FindProvider,
  testSubjects: TestSubjects,
  browser: BrowserProvider,
  toasts: ToastsService,
  security: SecurityServiceProvider,
};
