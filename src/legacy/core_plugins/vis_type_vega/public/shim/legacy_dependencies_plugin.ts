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

import chrome from 'ui/chrome';
import 'ui/vis/map/service_settings';
import 'ui/es'; // required for $injector.get('es') below
import { CoreStart, Plugin } from 'kibana/public';

/** @internal */
export interface LegacyDependenciesPluginSetup {
  es: any;
  serviceSettings: any;
}

export class LegacyDependenciesPlugin
  implements Plugin<Promise<LegacyDependenciesPluginSetup>, void> {
  public async setup() {
    const $injector = await chrome.dangerouslyGetActiveInjector();

    return {
      // Client of Elastic Search.
      es: $injector.get('es'),

      // Settings for EMSClient.
      // EMSClient, which currently lives in the tile_map vis,
      //  will probably end up being exposed from the future vis_type_maps plugin,
      //  which would register both the tile_map and the region_map vis plugins.
      serviceSettings: $injector.get('serviceSettings'),
    } as LegacyDependenciesPluginSetup;
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
