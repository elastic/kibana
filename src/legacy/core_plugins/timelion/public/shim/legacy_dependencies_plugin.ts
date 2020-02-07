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
import { CoreSetup, Plugin } from 'kibana/public';
import { initTimelionLegacyModule } from './timelion_legacy_module';
import { Panel } from '../panels/panel';

/** @internal */
export interface LegacyDependenciesPluginSetup {
  $rootScope: any;
  $compile: any;
}

export class LegacyDependenciesPlugin
  implements Plugin<Promise<LegacyDependenciesPluginSetup>, void> {
  public async setup(core: CoreSetup, timelionPanels: Map<string, Panel>) {
    initTimelionLegacyModule(timelionPanels);

    const $injector = await chrome.dangerouslyGetActiveInjector();

    return {
      $rootScope: $injector.get('$rootScope'),
      $compile: $injector.get('$compile'),
    } as LegacyDependenciesPluginSetup;
  }

  public start() {
    // nothing to do here yet
  }
}
