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
import 'ui/es'; // required for $injector.get('es') below
import { Plugin } from 'kibana/public';
// @ts-ignore
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { initTimelionLegacyModule } from './timelion_legacy_module';

/** @internal */
export interface LegacyDependenciesPluginSetup {
  $http: any;
  config: any;
  createAngularVisualization: Function;
}

/** @internal */
export interface LegacyDependenciesPluginStart {
  $rootScope: any;
  $compile: any;
  config: any;
}

export class LegacyDependenciesPlugin
  implements
    Plugin<Promise<LegacyDependenciesPluginSetup>, Promise<LegacyDependenciesPluginStart>> {
  public async setup() {
    // Init kibana/timelion_vis AngularJS module.
    initTimelionLegacyModule();

    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private');

    return {
      $http: $injector.get('$http'),
      config: chrome.getUiSettingsClient(),
      createAngularVisualization: VisFactoryProvider(Private).createAngularVisualization,
    } as LegacyDependenciesPluginSetup;
  }

  public async start() {
    const $injector = await chrome.dangerouslyGetActiveInjector();

    return {
      $rootScope: $injector.get('$rootScope'),
      $compile: $injector.get('$compile'),
      config: chrome.getUiSettingsClient(),
    } as LegacyDependenciesPluginStart;
  }
}
