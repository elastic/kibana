/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Subject } from 'rxjs';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './types';
import { SavedObjectsManagement } from './services';
import { registerRoutes } from './routes';
import { capabilitiesProvider } from './capabilities_provider';
import {
  MyExampleService,
  myExampleServiceId,
  MyExampleRequestHandler,
  myExampleRequestHandlerId,
} from './injection_example';

export class SavedObjectsManagementPlugin
  implements Plugin<SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, {}, {}>
{
  private readonly logger: Logger;
  private managementService$ = new Subject<SavedObjectsManagement>();

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public setup({ http, capabilities, injection }: CoreSetup) {
    this.logger.debug('Setting up SavedObjectsManagement plugin');
    registerRoutes({
      http,
      managementServicePromise: firstValueFrom(this.managementService$),
    });

    capabilities.registerProvider(capabilitiesProvider);

    injection.setupModule((pluginContainer, { createModule }) => {
      pluginContainer.bind(myExampleServiceId).to(MyExampleService).inSingletonScope();

      return {
        global: createModule(({ bind }) => {
          // bind a global service though Core's injector
          // by re-exposing the plugin's local service
          bind(myExampleServiceId)
            .toDynamicValue(() => {
              return pluginContainer.get(myExampleServiceId);
            })
            .inSingletonScope();
        }),
        request: createModule(({ bind }) => {
          // bind a request-scoped service
          // note that is can use the services from the plugin's container
          bind(myExampleRequestHandlerId)
            .to(MyExampleRequestHandler)
            // yes, it's a singleton at the request container's level
            .inSingletonScope();
        }),
      };
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Starting up SavedObjectsManagement plugin');
    const managementService = new SavedObjectsManagement(core.savedObjects.getTypeRegistry());
    this.managementService$.next(managementService);

    // retrieve the service and use it
    const myService = core.injection.container.get(myExampleServiceId);
    myService.doSomething();

    return {};
  }
}
