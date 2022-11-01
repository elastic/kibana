/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createCorePrebootMock } from './core_preboot.mock';
import { createCoreSetupMock } from './core_setup.mock';
import { createCoreStartMock } from './core_start.mock';

import { createInternalCorePrebootMock } from './internal_core_preboot.mock';
import { createInternalCoreSetupMock } from './internal_core_setup.mock';
import { createInternalCoreStartMock } from './internal_core_start.mock';

export const coreLifecycleMock = {
  createPreboot: createCorePrebootMock,
  createCoreSetup: createCoreSetupMock,
  createCoreStart: createCoreStartMock,
};

export const coreInternalLifecycleMock = {
  createInternalPreboot: createInternalCorePrebootMock,
  createInternalSetup: createInternalCoreSetupMock,
  createInternalStart: createInternalCoreStartMock,
};
