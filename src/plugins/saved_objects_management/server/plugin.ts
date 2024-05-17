/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { Subject, firstValueFrom } from 'rxjs';
import { capabilitiesProvider } from './capabilities_provider';
import { registerRoutes } from './routes';
import { SavedObjectsManagement } from './services';
import { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './types';

export class SavedObjectsManagementPlugin
  implements Plugin<SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, {}, {}>
{
  private readonly logger: Logger;
  private managementService$ = new Subject<SavedObjectsManagement>();

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public setup({ http, capabilities }: CoreSetup) {
    this.logger.debug('Setting up SavedObjectsManagement plugin');
    registerRoutes({
      http,
      managementServicePromise: firstValueFrom(this.managementService$),
    });

    capabilities.registerProvider(capabilitiesProvider);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Starting up SavedObjectsManagement plugin');
    const managementService = new SavedObjectsManagement(core.savedObjects.getTypeRegistry());
    this.managementService$.next(managementService);

    return {};
  }
}
