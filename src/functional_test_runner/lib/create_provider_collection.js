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

import {
  ProviderCollection,
  readProviderSpec
} from './providers';

/**
 *  Create a ProviderCollection that includes the Service
 *  providers and PageObject providers from config, as well
 *  providers for the default services, lifecycle, log, and
 *  config
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Config} config    [description]
 *  @return {ProviderCollection}
 */
export function createProviderCollection(lifecycle, log, config) {
  return new ProviderCollection(log, [
    ...readProviderSpec('Service', {
      // base level services that functional_test_runner exposes
      lifecycle: () => lifecycle,
      log: () => log,
      config: () => config,

      ...config.get('services'),
    }),
    ...readProviderSpec('PageObject', {
      ...config.get('pageObjects')
    })
  ]);
}
