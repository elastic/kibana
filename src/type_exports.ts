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

/**
 * This file re-exports only those Kibana types that we'd like plugins to have access to.
 *
 * Generated types are referenced from the `types` field of the Kibana's `package.json`, so
 * that plugins can just reference Kibana root folder to access all required types.
 *
 * Here is an example of how plugin can use these types assuming it is located
 * in one of the known plugin locations (kibana/plugins/* or kibana-extra/*):
 *
 * ```ts
 * import { KibanaPlugin } from '../../kibana';
 *
 * export interface SomePluginContract {
 *   setValue: (val: string) => void;
 * }
 *
 * class SomePlugin extends KibanaPlugin<SomePluginContract> {
 *   start(core) {
 *     let value = 'Hello World!';
 *
 *     const router = core.http.createAndRegisterRouter('/some-path');
 *     router.get('/some-value', (req, res) => res.ok(value));
 *
 *     return { setValue: (val: string) => { value = val; } };
 *   }
 * }
 * ```
 *
 * **NOTE:** If the code is not needed in plugins, we can add a `at_internal` JSDoc
 * annotation to that code. And since we've specified the `stripInternal` compiler
 * option TypeScript will not emit declarations for this code.
 */

export { Logger, LoggerFactory } from './core/server/logging';
