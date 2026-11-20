/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, Subject } from 'rxjs';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './types';
import { ApiBodyRegistry, SavedObjectsManagement } from './services';
import { registerRoutes } from './routes';
import { exportReferencedObjects, importReferencedObjects } from './services/referenced_objects';
import { createDataViewApiBodyEntry } from './services/data_view_api_body_entry';
import { capabilitiesProvider } from './capabilities_provider';

export class SavedObjectsManagementPlugin
  implements Plugin<SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, {}, {}>
{
  private readonly logger: Logger;
  private managementService$ = new Subject<SavedObjectsManagement>();
  private readonly apiBodyRegistry = new ApiBodyRegistry();

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public setup({ http, capabilities }: CoreSetup): SavedObjectsManagementPluginSetup {
    this.logger.debug('Setting up SavedObjectsManagement plugin');
    registerRoutes({
      http,
      managementServicePromise: firstValueFrom(this.managementService$),
    });

    capabilities.registerProvider(capabilitiesProvider);
    this.apiBodyRegistry.register(DATA_VIEW_SAVED_OBJECT_TYPE, createDataViewApiBodyEntry());

    return {
      registerApiBodyEntry: (type, entry) => this.apiBodyRegistry.register(type, entry),
    };
  }

  public start(core: CoreStart): SavedObjectsManagementPluginStart {
    this.logger.debug('Starting up SavedObjectsManagement plugin');
    const managementService = new SavedObjectsManagement(core.savedObjects.getTypeRegistry());
    this.managementService$.next(managementService);

    return {
      getApiBodyEntry: (type) => this.apiBodyRegistry.get(type),
      exportReferencedObjects: ({ request, client, roots }) =>
        exportReferencedObjects({
          exporter: core.savedObjects.createExporter(client),
          registry: this.apiBodyRegistry,
          request,
          roots,
          exportSizeLimit: this.context.config.legacy.get().savedObjects.maxImportExportSize,
        }),
      importReferencedObjects: ({ client, objects, mode, decisions }) =>
        importReferencedObjects({
          client,
          importer: core.savedObjects.createImporter(client),
          registry: this.apiBodyRegistry,
          typeRegistry: core.savedObjects.getTypeRegistry(),
          objects,
          mode,
          decisions,
        }),
    };
  }
}
