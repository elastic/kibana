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
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import {
  AlertExamplePluginSetup,
  AlertExamplePluginStart,
  AlertExamplePluginSetupDependencies,
} from './types';
import { defineRoutes } from './routes';

import { alertType as AlwaysFiring } from './alert_types/always_firing';
import { alertType as Weather } from './alert_types/weather';
import { alertType as StockPrice } from './alert_types/stock_price';
import { alertType as NoExpression } from './alert_types/no_expression';
import { alertType as FiresOnce } from './alert_types/fires_once';

export class AlertExamplePlugin
  implements Plugin<AlertExamplePluginSetup, AlertExamplePluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: AlertExamplePluginSetupDependencies) {
    this.logger.debug('Alert Example: Setup');
    const router = core.http.createRouter();

    plugins.alerting.registerType(AlwaysFiring);
    plugins.alerting.registerType(Weather);
    plugins.alerting.registerType(StockPrice);
    plugins.alerting.registerType(NoExpression);
    plugins.alerting.registerType(FiresOnce);

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Alert Example: Started');
    return {};
  }

  public stop() {}
}
