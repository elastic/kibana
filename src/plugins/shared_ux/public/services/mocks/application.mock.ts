/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '../types';
import { SharedUXApplicationService } from '../application';
import { Observable } from 'rxjs';

export type MockApplicationServiceFactory = PluginServiceFactory<SharedUXApplicationService>;

/**
 * A factory function for creating a Jest-based implementation of `SharedUXApplicationService`.
 */
export const applicationServiceFactory: MockApplicationServiceFactory = () => ({
  navigateToUrl: () => Promise.resolve(),
  currentAppId$: new Observable(),
});
