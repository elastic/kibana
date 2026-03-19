/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setUnifiedDocViewerServices } from '../plugin';
import type { UnifiedDocViewerServices } from '../types';

// Many unit tests render components in isolation without running the plugin `start()`.
// Provide a default set of services so calls to `getUnifiedDocViewerServices()` don't throw.
setUnifiedDocViewerServices({
  analytics: {
    reportEvent: jest.fn(),
  },
} as unknown as UnifiedDocViewerServices);
