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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';

/**
 * Interface for this plugin's returned `setup` contract.
 *
 * @public
 */
export interface DataSetup {} // eslint-disable-line @typescript-eslint/no-empty-interface

/**
 * Interface for this plugin's returned `start` contract.
 *
 * @public
 */
export interface DataStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

/**
 * Data Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces. The remaining items exported here are either types,
 * or static code.
 */

export class DataPlugin implements Plugin<DataSetup, DataStart> {
  public setup(core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart): DataStart {
    return {};
  }

  public stop() {}
}
