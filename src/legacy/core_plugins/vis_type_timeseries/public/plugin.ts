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
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../../plugins/expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';

import { createMetricsFn } from './metrics_fn';
import { metricsVisDefinition } from './metrics_type';
import {
  setSavedObjectsClient,
  setUISettings,
  setI18n,
  setFieldFormats,
  setCoreStart,
  setDataStart,
} from './services';
import { DataPublicPluginStart } from '../../../../plugins/data/public';

/** @internal */
export interface MetricsPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface MetricsPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class MetricsPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations }: MetricsPluginSetupDependencies
  ) {
    expressions.registerFunction(createMetricsFn);
    setUISettings(core.uiSettings);
    visualizations.types.createReactVisualization(metricsVisDefinition);
  }

  public start(core: CoreStart, { data }: MetricsPluginStartDependencies) {
    setSavedObjectsClient(core.savedObjects);
    setI18n(core.i18n);
    setFieldFormats(data.fieldFormats);
    setDataStart(data);
    setCoreStart(core);
  }
}
