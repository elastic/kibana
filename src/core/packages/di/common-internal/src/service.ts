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
import { Global } from '@kbn/core-di-common';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './contracts';
import { InternalDiSetupService, InternalDiService } from './services';
import { Plugin, PluginModule, Scope } from './modules/plugin';

/** @internal */
export class CoreInjectionService {
  private root = new Container({ defaultScope: 'Singleton', skipBaseClassChecks: true });

  constructor() {
    this.dispose = this.dispose.bind(this);
    this.fork = this.fork.bind(this);
    this.getContainer = this.getContainer.bind(this);
  }

  protected getContainer(
    id?: PluginOpaqueId,
    container: interfaces.Container = this.root
  ): interfaces.Container {
    return id ? container.getNamed(Plugin, id) : container;
  }

  protected dispose(container: interfaces.Container): void {
    const context = PluginModule.getContext(container);
    if (context === this.root && container !== this.root) {
      // to prevent accidental disposal outside of the internal contract
      throw new Error('The root container can only be explicitly disposed');
    }

    context.unbindAll();
  }

  protected fork(
    id?: PluginOpaqueId,
    container: interfaces.Container = this.root
  ): interfaces.Container {
    const fork = PluginModule.getContext(container).createChild();

    return this.getContainer(id, fork);
  }

  public setup(): InternalCoreDiServiceSetup {
    const contract = {
      getContainer: this.getContainer,
    };
    this.root.load(new PluginModule());
    this.root.bind(InternalDiSetupService).toConstantValue(contract);

    return contract;
  }

  public start(): InternalCoreDiServiceStart {
    const contract = {
      dispose: this.dispose,
      fork: this.fork,
      getContainer: this.getContainer,
    };

    this.root.bind(InternalDiService).toConstantValue(contract);
    if (this.root.isCurrentBound(Scope)) {
      this.root.getAll(Scope).forEach((scope) => scope.getAll(Global));
    }

    return contract;
  }
}
