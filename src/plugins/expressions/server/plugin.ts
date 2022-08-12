/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Container } from 'inversify';
import {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ExpressionsService, ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';
import {
  ExpressionsModule,
  KibanaRequestToken,
  LoggerToken,
  SavedObjectsClientToken,
  UiSettingsClientToken,
} from '../common/module';

export type ExpressionsServerSetup = ExpressionsServiceSetup;

export type ExpressionsServerStart = ExpressionsServiceStart;

export class ExpressionsServerPlugin
  implements Plugin<ExpressionsServerSetup, ExpressionsServerStart>
{
  private readonly container = new Container({ skipBaseClassChecks: true });

  constructor(context: PluginInitializerContext) {
    this.container.load(ExpressionsModule());
    this.container.bind(LoggerToken).toConstantValue(context.logger.get('expressions'));
  }

  public setup({}: CoreSetup): ExpressionsServerSetup {
    const setup = this.container.get(ExpressionsService).setup();

    return Object.freeze(setup);
  }

  public start({ savedObjects, uiSettings }: CoreStart): ExpressionsServerStart {
    this.container
      .bind(SavedObjectsClientToken)
      .toDynamicValue(async ({ container }) => {
        const kibanaRequest = container.get(KibanaRequestToken);
        const savedObjectsClient = savedObjects.getScopedClient(kibanaRequest);

        return savedObjectsClient;
      })
      .inRequestScope();
    this.container
      .bind(UiSettingsClientToken)
      .toDynamicValue(async ({ container }) => {
        const savedObjectsClient = await container.getAsync(SavedObjectsClientToken);
        const uiSettingsClient = uiSettings.asScopedToClient(
          savedObjectsClient as SavedObjectsClientContract
        );

        return uiSettingsClient;
      })
      .inRequestScope();

    const start = this.container.get(ExpressionsService).start();

    return Object.freeze(start);
  }

  public stop() {
    this.container.get(ExpressionsService).stop();
  }
}
