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

import { functionsRegistry } from '../../interpreter/public/registries';
import { visualizations, VisualizationsSetup } from '../../visualizations/public';
import { DataSetup } from '../../data/public';
import { LegacyDependenciesPlugin } from './shim';

/** @public */
export interface VegaPluginSetupDependencies {
  // TODO: Remove `any` as functionsRegistry will be added to the DataSetup.
  data: DataSetup | any;
  visualizations: VisualizationsSetup;
  __LEGACY: LegacyDependenciesPlugin;
}

export const plugins: VegaPluginSetupDependencies = {
  data: {
    expressions: {
      registerFunction: (fn: any) => functionsRegistry.register(fn),
    },
  },
  visualizations,

  // Temporary solution
  // It will be removed when all dependent services are migrated to the new platform.
  __LEGACY: new LegacyDependenciesPlugin(),
};
