/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginServiceFactory } from '../types';
import type { SharedUXPlatformService } from '../platform';

/**
 * A factory function for creating a Jest-based implementation of `SharedUXPlatformService`.
 */
export type MockPlatformServiceFactory = PluginServiceFactory<SharedUXPlatformService>;

/**
 * A factory function for creating a Jest-based implementation of `SharedUXPlatformService`.
 */
export const platformServiceFactory: MockPlatformServiceFactory = () => ({
  setIsFullscreen: jest.fn(),
});
