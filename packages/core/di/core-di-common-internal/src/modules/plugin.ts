/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule, type interfaces } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global } from '@kbn/core-di-common';

export const Context = Symbol('Context') as interfaces.ServiceIdentifier<interfaces.Container>;
export const Id = Symbol('Id') as interfaces.ServiceIdentifier<PluginOpaqueId>;
export const Plugin = Symbol('Plugin') as interfaces.ServiceIdentifier<interfaces.Container>;
export const Scope = Symbol('Scope') as interfaces.ServiceIdentifier<interfaces.Container>;

export class PluginModule extends ContainerModule {
  static getContext(container: interfaces.Container): interfaces.Container {
    return container.isBound(Context) ? container.get(Context) : container;
  }

  private scopes = new WeakMap<interfaces.Container, Set<PluginOpaqueId>>();
  private services = new WeakMap<
    interfaces.Container,
    Map<interfaces.ServiceIdentifier<unknown>, number>
  >();
  private bound = new WeakSet<interfaces.Container>();

  constructor() {
    super((bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
      bind(Plugin).toDynamicValue(this.getScope).inRequestScope();
      onActivation(Global, this.bindService);
    });
  }

  protected getScope: interfaces.DynamicValue<interfaces.Container> = ({
    container,
    currentRequest: { target },
  }) => {
    const name = target.getNamedTag()?.value as PluginOpaqueId | undefined;

    if (!name) {
      throw new Error('Plugin instance must be named.');
    }

    if (!this.isScopeExist(container, name)) {
      this.createScope(container, name);
    }

    return container.getNamed(Scope, name);
  };

  protected bindService: interfaces.BindingActivation<interfaces.ServiceIdentifier<unknown>> = (
    { container: scope },
    service
  ) => {
    const context = scope.get(Context);
    const name = scope.get(Id);
    const index = this.getServicesCount(scope, service);

    this.incrementServicesCount(scope, service);
    if (scope.parent !== context) {
      this.incrementServicesCount(context, service);
    }

    context
      .bind(service)
      .toDynamicValue(({ container: origin }) => {
        const target = PluginModule.getContext(origin).getNamed(Plugin, name);

        this.bindServices(origin);
        this.inheritServices(target);

        return this.getServicesCount(scope, service) > 1
          ? target.getAll(service)[index]
          : target.get(service);
      })
      .inRequestScope();

    return service;
  };

  private isScopeExist(container: interfaces.Container, name: PluginOpaqueId) {
    return !!this.scopes.get(container)?.has(name);
  }

  private createScope(container: interfaces.Container, name: PluginOpaqueId) {
    const parent = container.parent?.getNamed(Plugin, name) ?? container;
    const scope = parent.createChild();

    scope.bind(Context).toConstantValue(container);
    scope.bind(Id).toConstantValue(name);

    container
      .bind(Scope)
      .toConstantValue(scope)
      .whenTargetNamed(name)
      .onDeactivation(() => {
        this.scopes.get(container)?.delete(name);
        scope.unbindAll();
      });

    if (!this.scopes.has(container)) {
      this.scopes.set(container, new Set());
    }

    this.scopes.get(container)?.add(name);
  }

  private getServicesCount(
    scope: interfaces.Container,
    service: interfaces.ServiceIdentifier<unknown>
  ) {
    return this.services.get(scope)?.get(service) ?? 0;
  }

  private incrementServicesCount(
    scope: interfaces.Container,
    service: interfaces.ServiceIdentifier<unknown>
  ) {
    if (!this.services.has(scope)) {
      this.services.set(scope, new Map());
    }

    this.services.get(scope)?.set(service, this.getServicesCount(scope, service) + 1);
  }

  private bindServices(scope: interfaces.Container) {
    if (this.bound.has(scope)) {
      return;
    }
    this.bound.add(scope);

    if (!scope.isCurrentBound(Global)) {
      return;
    }
    scope.getAll(Global);
  }

  private inheritServices(scope: interfaces.Container) {
    if (this.bound.has(scope)) {
      return;
    }
    this.bound.add(scope);

    for (const [service, count] of this.services.get(scope.get(Context)) ?? []) {
      for (let index = 0; index < count; index++) {
        scope
          .bind(service)
          .toDynamicValue(({ container }) => {
            const context = container.get(Context);

            return count > 1 ? context.getAll(service)[index] : context.get(service);
          })
          .inRequestScope();
      }
    }
  }
}
