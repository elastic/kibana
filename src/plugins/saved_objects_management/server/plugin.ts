/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './types';
import { SavedObjectsManagement } from './services';
import { registerRoutes } from './routes';
import { capabilitiesProvider } from './capabilities_provider';

export class SavedObjectsManagementPlugin
  implements Plugin<SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, {}, {}> {
  private readonly logger: Logger;
  private managementService$ = new Subject<SavedObjectsManagement>();

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public async setup({ http, capabilities }: CoreSetup) {
    this.logger.debug('Setting up SavedObjectsManagement plugin');
    registerRoutes({
      http,
      managementServicePromise: this.managementService$.pipe(first()).toPromise(),
    });

    capabilities.registerProvider(capabilitiesProvider);

    return {};
  }

  public async start(core: CoreStart) {
    this.logger.debug('Starting up SavedObjectsManagement plugin');
    const managementService = new SavedObjectsManagement(core.savedObjects.getTypeRegistry());
    this.managementService$.next(managementService);

    return {};
  }
}
