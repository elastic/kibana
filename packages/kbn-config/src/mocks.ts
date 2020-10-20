/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
