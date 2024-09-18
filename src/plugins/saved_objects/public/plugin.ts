/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart, Plugin } from '@kbn/core/public';

import './index.scss';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  createSavedObjectClass,
  SavedObjectDecoratorRegistry,
  SavedObjectDecoratorConfig,
} from './saved_object';
import { SavedObject } from './types';
import { setStartServices } from './kibana_services';

export interface SavedObjectSetup {
  registerDecorator: (config: SavedObjectDecoratorConfig<any>) => void;
}

export interface SavedObjectsStart {
  /**
   * @deprecated
   * @removeBy 8.8.0
   */
  SavedObjectClass: new (raw: Record<string, any>) => SavedObject;
}

export interface SavedObjectsStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export class SavedObjectsPublicPlugin
  implements Plugin<SavedObjectSetup, SavedObjectsStart, object, SavedObjectsStartDeps>
{
  private decoratorRegistry = new SavedObjectDecoratorRegistry();

  public setup(): SavedObjectSetup {
    return {
      registerDecorator: (config) => this.decoratorRegistry.register(config),
    };
  }
  public start(core: CoreStart, { data, dataViews }: SavedObjectsStartDeps) {
    setStartServices(core);
    return {
      SavedObjectClass: createSavedObjectClass(
        {
          dataViews,
          savedObjectsClient: core.savedObjects.client,
          search: data.search,
          chrome: core.chrome,
          overlays: core.overlays,
        },
        core,
        this.decoratorRegistry
      ),
    };
  }
}
