/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/config-schema';

import type {
  PluginStart,
  DataRequestHandlerContext,
} from '../../../../../src/plugins/data/server';
import { CoreSetup, PluginInitializerContext, Plugin } from '../../../../../src/core/server';
import { configSchema } from '../config';
import loadFunctions from './lib/load_functions';
import { functionsRoute } from './routes/functions';
import { runRoute } from './routes/run';
import { ConfigManager } from './lib/config_manager';
import { getUiSettings } from './ui_settings';

export interface TimelionPluginStartDeps {
  data: PluginStart;
}

/**
 * Represents Timelion Plugin instance that will be managed by the Kibana plugin system.
 */
export class TimelionPlugin implements Plugin<void, void, TimelionPluginStartDeps> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup<TimelionPluginStartDeps>): void {
    const config = this.initializerContext.config.get<TypeOf<typeof configSchema>>();

    const configManager = new ConfigManager(this.initializerContext.config);

    const functions = loadFunctions('series_functions');

    const getFunction = (name: string) => {
      if (functions[name]) {
        return functions[name];
      }

      throw new Error(
        i18n.translate('timelion.noFunctionErrorMessage', {
          defaultMessage: 'No such function: {name}',
          values: { name },
        })
      );
    };

    const logger = this.initializerContext.logger.get('timelion');

    const router = core.http.createRouter<DataRequestHandlerContext>();

    const deps = {
      configManager,
      functions,
      getFunction,
      logger,
      core,
    };

    functionsRoute(router, deps);
    runRoute(router, deps);

    core.uiSettings.register(getUiSettings(config));
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting plugin');
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping plugin');
  }
}
