/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import type { interfaces } from 'inversify';
import { chain } from 'lodash';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global } from '@kbn/core-di-common';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './internal_contracts';

/** @internal */
export class CoreInjectionService {
  private static readonly Context = Symbol(
    'Context'
  ) as interfaces.ServiceIdentifier<interfaces.Container>;
  private static readonly Id = Symbol('Id') as interfaces.ServiceIdentifier<symbol>;
  private static readonly Scope = Symbol(
    'Scope'
  ) as interfaces.ServiceIdentifier<interfaces.Container>;

  private static bindGlobals(target: interfaces.Container, source: interfaces.Container) {
    const id = source.isCurrentBound(this.Id) ? source.get(this.Id) : undefined;
    const getScope: (container: interfaces.Container) => interfaces.Container = id
      ? (container) =>
          container.get(CoreInjectionService.Context).getNamed(CoreInjectionService.Scope, id)
      : () => source;

    chain(source.isCurrentBound(Global) ? source.getAll(Global) : [])
      .groupBy()
      // `.groupBy` creates an object with symbol keys that are ignored by lodash down the chain
      .cloneWith((services) =>
        Reflect.ownKeys(services).map((service) => services[service as keyof typeof services])
      )
      .flatMap((services) =>
        services.map((service, index) => ({
          service,
          index: services.length === 1 ? undefined : index,
        }))
      )
      .value()
      .forEach(({ index, service }) => {
        target
          .bind(service)
          .toDynamicValue(({ container }) => {
            const scope = getScope(container);

            return index == null ? scope.get(service) : scope.getAll(service)[index];
          })
          .inRequestScope();
      });
  }

  private root = new Container({ defaultScope: 'Singleton', skipBaseClassChecks: true });

  constructor(private readonly coreContext: CoreContext) {
    this.getContainer = this.getContainer.bind(this);
    this.fork = this.fork.bind(this);
    this.load = this.load.bind(this);
  }

  protected getContainer(id: PluginOpaqueId, root = this.root) {
    return root.isBoundNamed(CoreInjectionService.Scope, id)
      ? root.getNamed(CoreInjectionService.Scope, id)
      : undefined;
  }

  protected load(id: PluginOpaqueId, module: interfaces.ContainerModule): void {
    if (!this.root.isBoundNamed(CoreInjectionService.Scope, id)) {
      const scope = this.root.createChild();

      scope.bind(CoreInjectionService.Id).toConstantValue(id);
      this.root.bind(CoreInjectionService.Scope).toConstantValue(scope).whenTargetNamed(id);
    }

    this.getContainer(id)!.load(module);
  }

  protected fork(root: interfaces.Container = this.root) {
    const fork = root.createChild();
    const scopes = root.isCurrentBound(CoreInjectionService.Scope)
      ? root.getAll(CoreInjectionService.Scope)
      : [];

    scopes
      .map((scope) => scope.get(CoreInjectionService.Id))
      .forEach((id) => {
        fork
          .bind(CoreInjectionService.Scope)
          .toDynamicValue(({ container }) =>
            container.parent!.getNamed(CoreInjectionService.Scope, id).createChild()
          )
          .inSingletonScope()
          .onActivation(({ container }, scope) => {
            scope.bind(CoreInjectionService.Context).toConstantValue(container);
            CoreInjectionService.bindGlobals(scope, container);

            return scope;
          })
          .whenTargetNamed(id);
      });

    return fork;
  }

  public setup(): InternalCoreDiServiceSetup {
    return {
      load: this.load,
    };
  }

  public start(): InternalCoreDiServiceStart {
    this.root
      .bind(CoreInjectionService.Context)
      .toDynamicValue(({ container }) => container)
      .inRequestScope();

    if (this.root.isBound(CoreInjectionService.Scope)) {
      this.root
        .getAll(CoreInjectionService.Scope)
        .forEach((scope) => CoreInjectionService.bindGlobals(this.root, scope));
    }

    return {
      getContainer: this.getContainer,
      fork: this.fork,
      root: this.root,
    };
  }
}
