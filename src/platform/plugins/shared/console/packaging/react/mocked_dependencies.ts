/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMockedCoreContext } from '@kbn/standalone-packaging-utils';
import { createMockedInjectedMetadata } from '@kbn/standalone-packaging-utils';
import { createMockedTrackUiMetric } from '@kbn/standalone-packaging-utils';

export const coreContext = createMockedCoreContext({
  version: '1.0.0',
  branch: 'main',
  buildNum: 1,
  buildSha: 'prod-build',
  buildShaShort: 'prod',
  mode: 'production',
  enableConsoleLogging: true,
});

export const injectedMetadata = createMockedInjectedMetadata({
  kibanaBranch: 'main',
  kibanaVersion: '9.3.0',
  kibanaBuildNumber: 12345,
});

export const trackUiMetric = createMockedTrackUiMetric();
