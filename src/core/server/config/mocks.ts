/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  configMock as configMockNonTyped,
  configServiceMock as configServiceMockNonTyped,
  getEnvOptions as getEnvOptionsNonTyped,
  rawConfigServiceMock as rawConfigServiceMockNonTyped,
  // @ts-expect-error
} from '@kbn/config/target_node/mocks';
import type {
  configMock as configMockTyped,
  configServiceMock as configServiceMockTyped,
  getEnvOptions as getEnvOptionsTyped,
  rawConfigServiceMock as rawConfigServiceMockTyped,
} from '@kbn/config/target_types/mocks';

const getEnvOptions: typeof getEnvOptionsTyped = getEnvOptionsNonTyped;
const rawConfigServiceMock: typeof rawConfigServiceMockTyped = rawConfigServiceMockNonTyped;
const configServiceMock: typeof configServiceMockTyped = configServiceMockNonTyped;
const configMock: typeof configMockTyped = configMockNonTyped;
export { getEnvOptions };
export { rawConfigServiceMock };
export { configServiceMock };
export { configMock };
