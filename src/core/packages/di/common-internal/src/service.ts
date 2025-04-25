/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './contracts';
import { Plugin, PluginModule } from './modules/plugin';
import { InternalContainer } from './container';

/** @internal */
export class CoreInjectionService {
  private root = new InternalContainer({ defaultScope: 'Singleton' });

  constructor() {
    this.fork = this.fork.bind(this);
    this.getContainer = this.getContainer.bind(this);
  }

  protected getContainer(id?: PluginOpaqueId, container: Container = this.root): Container {
    return id ? container.get(Plugin)(id) : container;
  }

  protected fork(id?: PluginOpaqueId, container: Container = this.root): Container {
    if (!(container instanceof InternalContainer)) {
      throw new Error('The container has not been created using the dependency injection service.');
    }

    const fork = container.createChild();
    if (id) {
      fork.onDeactivation(id, () => void setTimeout(() => fork.unbindAll()));
    }

    return this.getContainer(id, fork);
  }

  public setup(): InternalCoreDiServiceSetup {
    const contract = {
      getContainer: this.getContainer,
    };
    this.root.loadSync(new PluginModule());

    return contract;
  }

  public start(): InternalCoreDiServiceStart {
    const contract = {
      fork: this.fork,
      getContainer: this.getContainer,
    };

    return contract;
  }
}
