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

import { lazyLoadMapsLegacyModules } from './lazy_load_bundle';
// @ts-expect-error
import { getMapsLegacyConfig } from './kibana_services';
import { IServiceSettings } from './map/service_settings_types';

let loadPromise: Promise<IServiceSettings>;

export async function getServiceSettings(): Promise<IServiceSettings> {
  if (typeof loadPromise !== 'undefined') {
    return loadPromise;
  }

  loadPromise = new Promise(async (resolve) => {
    const modules = await lazyLoadMapsLegacyModules();
    const config = getMapsLegacyConfig();
    // @ts-expect-error
    resolve(new modules.ServiceSettings(config, config.tilemap));
  });
  return loadPromise;
}
