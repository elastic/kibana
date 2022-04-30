/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  getEnvOptions as getEnvOptionsTyped,
  rawConfigServiceMock as rawConfigServiceMockTyped,
  configServiceMock as configServiceMockTyped,
  configMock as configMockTyped,
  configDeprecationsMock as configDeprecationsMockTyped,
} from '@kbn/config/target_types/mocks';

import {
  getEnvOptions as getEnvOptionsNonTyped,
  rawConfigServiceMock as rawConfigServiceMockNonTyped,
  configServiceMock as configServiceMockNonTyped,
  configMock as configMockNonTyped,
  configDeprecationsMock as configDeprecationsMockNonTyped,
  // @ts-expect-error
} from '@kbn/config/target_node/mocks';

const getEnvOptions: typeof getEnvOptionsTyped = getEnvOptionsNonTyped;
const rawConfigServiceMock: typeof rawConfigServiceMockTyped = rawConfigServiceMockNonTyped;
const configServiceMock: typeof configServiceMockTyped = configServiceMockNonTyped;
const configMock: typeof configMockTyped = configMockNonTyped;
const configDeprecationsMock: typeof configDeprecationsMockTyped = configDeprecationsMockNonTyped;

export {
  getEnvOptions,
  rawConfigServiceMock,
  configServiceMock,
  configMock,
  configDeprecationsMock,
};
