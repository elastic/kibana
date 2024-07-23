/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, type interfaces } from 'inversify';
import { chain } from 'lodash';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global } from '@kbn/core-di-common';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './contracts';
import { InternalDiSetupService, InternalDiService } from './services';

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
        target.bind(Global).toConstantValue(service);
      });
  }

  private static getContext(container: interfaces.Container): interfaces.Container {
    return container.isBound(CoreInjectionService.Context)
      ? container.get(CoreInjectionService.Context)
      : container;
  }

  private static getScopes(container: interfaces.Container): interfaces.Container[] {
    return container.isCurrentBound(CoreInjectionService.Scope)
      ? container.getAll(CoreInjectionService.Scope)
      : [];
  }

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
    if (!id) {
      return container;
    }

    if (!container.isBoundNamed(CoreInjectionService.Scope, id)) {
      const scope = container.createChild();

      scope.bind(CoreInjectionService.Id).toConstantValue(id);
      container.bind(CoreInjectionService.Scope).toConstantValue(scope).whenTargetNamed(id);
    }

    return container.getNamed(CoreInjectionService.Scope, id)!;
  }

  protected dispose(container: interfaces.Container): void {
    const context = CoreInjectionService.getContext(container);
    if (context === this.root && container !== this.root) {
      // to prevent accidental disposal outside of the internal contract
      throw new Error('The root container can only be explicitly disposed');
    }

    CoreInjectionService.getScopes(context).forEach((scope) => scope.unbindAll());
    context.unbindAll();
  }

  protected fork(
    id?: PluginOpaqueId,
    container: interfaces.Container = this.root
  ): interfaces.Container {
    const context = CoreInjectionService.getContext(container);
    const fork = context.createChild();

    CoreInjectionService.getScopes(context)
      .map((scope) => scope.get(CoreInjectionService.Id))
      .forEach((scope) => {
        fork
          .bind(CoreInjectionService.Scope)
          // eslint-disable-next-line @typescript-eslint/no-shadow
          .toDynamicValue(({ container: fork }) =>
            fork.parent!.getNamed(CoreInjectionService.Scope, scope).createChild()
          )
          .inSingletonScope()
          .whenTargetNamed(scope)
          // eslint-disable-next-line @typescript-eslint/no-shadow
          .onActivation(({ container: fork }, scope) => {
            scope
              .bind(CoreInjectionService.Context)
              .toConstantValue(fork)
              // eslint-disable-next-line @typescript-eslint/no-shadow
              .onActivation(({ container: scope }, fork) => {
                // up from forked plugin scope to forked root
                CoreInjectionService.bindGlobals(fork, scope);

                return fork;
              });
            // down from forked root to forked plugin scope
            CoreInjectionService.bindGlobals(scope, fork);

            return scope;
          });
      });

    return this.getContainer(id, fork)!;
  }

  public setup(): InternalCoreDiServiceSetup {
    const contract = {
      getContainer: this.getContainer,
    };
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

    this.root
      .bind(CoreInjectionService.Context)
      .toDynamicValue(({ container }) => container)
      .inRequestScope();

    CoreInjectionService.getScopes(this.root).forEach((scope) =>
      CoreInjectionService.bindGlobals(this.root, scope)
    );

    return contract;
  }
}
