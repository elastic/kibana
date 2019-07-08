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

import { CoreSetup } from 'kibana/public';
import { DataSetup } from '../../data/public';
import { VisualizationsSetup } from '../../visualizations/public';
// @ts-ignore
import { tsvb } from './tsvb_fn';
// @ts-ignore
import { MetricsVis } from './kbn_vis_type';

export interface TsvbSetupPlugins {
  // TODO: Remove `any` as functionsRegistry will be added to the DataSetup.
  data: DataSetup | any;
  visualizations: VisualizationsSetup;
}

export class Plugin {
  public setup(core: CoreSetup, plugins: TsvbSetupPlugins) {
    plugins.data.expressions.functionsRegistry.register(tsvb);
    // register the provider with the visTypes registry so that other know it exists
    plugins.visualizations.types.VisTypesRegistryProvider.register(MetricsVis);
  }

  public start() {}

  public stop() {}
}
