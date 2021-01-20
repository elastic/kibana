/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// these CANT be exported by the main entrypoint, as it cause ts check failures
// in `src/test` and `src/xpack/test` projects due to definition conflicts between
// mocha and jest declaring the same globals such as `it` or `beforeAll`, as the test
// files imports types from `core` that is importing the main `@kbn/config` entrypoint.
// For now, these should be imported using `import {} from '@kbn/config/target/mocks'`
export { configMock } from './config.mock';
export { configServiceMock } from './config_service.mock';
export { rawConfigServiceMock } from './raw/raw_config_service.mock';
export { getEnvOptions } from './__mocks__/env';
