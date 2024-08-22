/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule, type interfaces } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global, OnSetup } from '@kbn/core-di';

const Context = Symbol('Context') as interfaces.ServiceIdentifier<interfaces.Container>;
const Id = Symbol('Id') as interfaces.ServiceIdentifier<PluginOpaqueId>;

export const Plugin = Symbol.for('Plugin') as interfaces.ServiceIdentifier<interfaces.Container>;

export class PluginModule extends ContainerModule {
  private services = new WeakMap<
    interfaces.Container,
    Map<interfaces.ServiceIdentifier<unknown>, number>
  >();
  private bound = new WeakSet<interfaces.Container>();

  constructor() {
    super((bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
      bind(OnSetup).toConstantValue((scope) => this.bindServices(scope));
      bind(Plugin).toDynamicValue(this.getScope).inRequestScope();
      onActivation(Global, this.bindService);
    });
  }

  protected getScope: interfaces.DynamicValue<interfaces.Container> = ({
    container,
    currentRequest: { target },
  }) => {
    const id = target.getNamedTag()?.value as PluginOpaqueId | undefined;

    if (!id) {
      throw new Error('Plugin instance must be named.');
    }

    if (!container.isCurrentBound(id)) {
      const parent = container.parent?.getNamed(Plugin, id) ?? container;
      const scope = parent.createChild();

      scope.bind(Id).toConstantValue(id);
      scope
        .bind(Context)
        .toConstantValue(container)
        .onDeactivation(() => {
          try {
            container.unbind(id);
            // eslint-disable-next-line no-empty
          } catch {}
        });

      container
        .bind(id)
        .toConstantValue(scope)
        .onDeactivation(() => scope.unbindAll());
    }

    return container.get(id);
  };

  protected bindService: interfaces.BindingActivation<interfaces.ServiceIdentifier> = (
    { container: scope },
    service
  ) => {
    const context = scope.get(Context);
    const id = scope.get(Id);
    const index = this.getServicesCount(scope, service);

    this.incrementServicesCount(scope, service);
    if (scope.parent !== context) {
      this.incrementServicesCount(context, service);
    }

    context
      .bind(service)
      .toDynamicValue(({ container: origin }) => {
        // eslint-disable-next-line @typescript-eslint/no-shadow
        const context = origin.isBound(Context) ? origin.get(Context) : origin;
        const target = context.getNamed(Plugin, id);

        this.bindServices(origin);
        this.inheritServices(target);

        return this.getServicesCount(scope, service) > 1
          ? target.getAll(service)[index]
          : target.get(service);
      })
      .inRequestScope();

    return service;
  };

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
