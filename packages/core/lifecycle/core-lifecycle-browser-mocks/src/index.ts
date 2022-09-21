/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createCoreSetupMock } from './core_setup.mock';
import { createCoreStartMock } from './core_start.mock';

export const coreLifecycleMock = {
  createCoreSetup: createCoreSetupMock,
  createCoreStart: createCoreStartMock,
};
