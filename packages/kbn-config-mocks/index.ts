/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { rawConfigServiceMock } from './src/raw_config_service.mock';
export type { RawConfigServiceMock } from './src/raw_config_service.mock';

export { configMock } from './src/config.mock';
export type { ConfigMock } from './src/config.mock';

export { configServiceMock } from './src/config_service.mock';
export type { IConfigServiceMock } from './src/config_service.mock';

export { configDeprecationsMock } from './src/deprecations.mock';
export type { ConfigDeprecationContextMock } from './src/deprecations.mock';

export { createTestEnv, getEnvOptions, createTestPackageInfo } from './src/env.mock';
