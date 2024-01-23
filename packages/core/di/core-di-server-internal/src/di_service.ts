/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Container } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { ContainerModule, ReadonlyContainer } from '@kbn/core-di-common';
import {
  pluginOpaqueIdServiceId,
  pluginNameServiceId,
  pluginManifestServiceId,
} from '@kbn/core-di-common-internal';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './internal_contracts';
import { createModule } from './utils';

/** @internal */
export class CoreInjectionService {
  private rootContainer: Container;
  private pluginContainers: Map<PluginOpaqueId, Container> = new Map();
  private internalPluginModules: ContainerModule[] = [];
  // private blockInternalRegistration: false; // TODO: use

  constructor(coreContext: CoreContext) {
    this.rootContainer = new Container({ defaultScope: 'Singleton', skipBaseClassChecks: true });
  }

  public setup(): InternalCoreDiServiceSetup {
    return {
      configurePluginModule: (pluginId, callback) => {
        const pluginContainer = this.pluginContainers.get(pluginId)!;
        const modules = callback(pluginContainer, { createModule });
        if (modules.global) {
          // TODO
        }
        if (modules.request) {
          // TODO
        }
      },

      createPluginContainer: (pluginId, pluginManifest) => {
        // TODO: check if already exists
        const pluginContainer = this.rootContainer.createChild();
        this.pluginContainers.set(pluginId, pluginContainer);
        pluginContainer.bind(pluginOpaqueIdServiceId).toConstantValue(pluginId);
        pluginContainer.bind(pluginNameServiceId).toConstantValue(pluginManifest.id);
        pluginContainer.bind(pluginManifestServiceId).toConstantValue(pluginManifest);
        this.internalPluginModules.forEach((pluginModule) => {
          pluginContainer.load(pluginModule);
        });
        return pluginContainer;
      },

      registerPluginModule: (module) => {
        this.internalPluginModules.push(module);
      },
      registerGlobalModule: (module) => {
        // TODO
      },
      registerRequestModule: (module) => {
        // TODO
      },
    };
  }

  public start(): InternalCoreDiServiceStart {
    return {
      getPluginContainer: (pluginId: PluginOpaqueId) => {
        const pluginContainer = this.pluginContainers.get(pluginId)!;
        return toReadonly(pluginContainer);
      },
    };
  }
}

const toReadonly = (container: Container): ReadonlyContainer => {
  return {
    get: (id) => container.get(id),
  };
};
