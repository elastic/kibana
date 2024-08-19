/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, type interfaces } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './contracts';
import { InternalDiSetupService, InternalDiService } from './services';
import { LifecycleModule, Plugin, PluginModule } from './modules';

/** @internal */
export class CoreInjectionService {
  private root = new Container({ defaultScope: 'Singleton', skipBaseClassChecks: true });

  constructor() {
    this.fork = this.fork.bind(this);
    this.getContainer = this.getContainer.bind(this);
  }

  protected getContainer(
    id?: PluginOpaqueId,
    container: interfaces.Container = this.root
  ): interfaces.Container {
    return id ? container.getNamed(Plugin, id) : container;
  }

  protected fork(
    id?: PluginOpaqueId,
    container: interfaces.Container = this.root
  ): interfaces.Container {
    const fork = container.createChild();
    if (id) {
      fork.onDeactivation(id, () => fork.unbindAll());
    }

    return this.getContainer(id, fork);
  }

  public setup(): InternalCoreDiServiceSetup {
    const contract = {
      getContainer: this.getContainer,
    };
    this.root.load(new LifecycleModule());
    this.root.load(new PluginModule());
    this.root.bind(InternalDiSetupService).toConstantValue(contract);

    return contract;
  }

  public start(): InternalCoreDiServiceStart {
    const contract = {
      fork: this.fork,
      getContainer: this.getContainer,
    };

    this.root.bind(InternalDiService).toConstantValue(contract);

    return contract;
  }
}
