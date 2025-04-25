/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { noop, once } from 'lodash';
import {
  type Container,
  ContainerModule,
  type ResolutionContext,
  type ServiceIdentifier,
} from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global, OnSetup, OnStart, Setup, Start } from '@kbn/core-di';
import { InternalContainer } from '../container';

const Context = Symbol('Context') as ServiceIdentifier<InternalContainer>;
const Id = Symbol('Id') as ServiceIdentifier<PluginOpaqueId>;

type PluginFactory = (id: PluginOpaqueId) => Container;
export const Plugin = Symbol.for('Plugin') as ServiceIdentifier<PluginFactory>;

export class PluginModule extends ContainerModule {
  private services = new WeakMap<Container, Map<ServiceIdentifier, number>>();
  private activated = new WeakSet<Container>();
  private bound = new WeakSet<Container>();

  constructor() {
    super(({ bind, onActivation }) => {
      bind(OnSetup).toConstantValue(this.onSetup.bind(this));
      bind(Plugin)
        .toResolvedValue(this.getPluginFactory.bind(this), [InternalContainer])
        .inRequestScope();
      bind(Setup).toResolvedValue(this.getDefaultContract.bind(this)).inRequestScope();
      bind(Start).toResolvedValue(this.getDefaultContract.bind(this)).inRequestScope();
      onActivation(Global, this.onGlobalActivation.bind(this));
      onActivation(Setup, this.onContractActivation.bind(this, OnSetup));
      onActivation(Start, this.onContractActivation.bind(this, OnStart));
    });
  }

  protected getDefaultContract() {
    return undefined;
  }

  protected onContractActivation<T>(
    hook: ServiceIdentifier<(container: Container) => void>,
    { get }: ResolutionContext,
    contract: T
  ): T {
    const container = get(InternalContainer);
    if (this.activated.has(container)) {
      return contract;
    }

    for (let current = container as typeof container.parent; current; current = current.parent) {
      if (current.isCurrentBound(hook)) {
        current.getAll(hook).forEach((callback) => callback(container));
      }
    }

    this.activated.add(container);

    return contract;
  }

  protected onGlobalActivation<T extends ServiceIdentifier>(
    { get }: ResolutionContext,
    service: T
  ): T {
    const scope = get(InternalContainer);
    const context = get(Context);
    const id = get(Id);
    const index = this.getServicesCount(scope, service);

    this.incrementServicesCount(scope, service);
    if (scope.parent !== context) {
      this.incrementServicesCount(context, service);
    }

    context
      .bind(service)
      .toResolvedValue<[InternalContainer, InternalContainer | undefined]>(
        // eslint-disable-next-line @typescript-eslint/no-shadow
        (origin, context = origin) => {
          const target = context.get(Plugin)(id);

          this.onSetup(origin);
          this.bindServices(target);

          return this.getServicesCount(scope, service) > 1
            ? target.getAll(service)[index]
            : target.get(service);
        },
        [InternalContainer, { serviceIdentifier: Context, optional: true }]
      )
      .inRequestScope();

    return service;
  }

  protected onSetup(scope: Container) {
    if (this.bound.has(scope)) {
      return;
    }
    this.bound.add(scope);

    if (!scope.isCurrentBound(Global)) {
      return;
    }
    scope.getAll(Global);
  }

  protected getPluginFactory(context: InternalContainer): PluginFactory {
    return (id) => {
      if (!context.isCurrentBound(id)) {
        const parent = context.parent?.get(Plugin)(id) ?? context;
        const scope = (parent as InternalContainer).createChild();

        scope.bind(Id).toConstantValue(id);
        scope
          .bind(Context)
          .toConstantValue(context)
          .onDeactivation(once(() => context.unbind(id).catch(noop)));
        scope.get(Context);

        context
          .bind(id)
          .toConstantValue(scope)
          .onDeactivation(once(() => scope.unbindAll()));
      }

      return context.get(id);
    };
  }

  private bindServices(scope: Container) {
    if (this.bound.has(scope)) {
      return;
    }
    this.bound.add(scope);

    for (const [service, count] of this.services.get(scope.get(Context)) ?? []) {
      for (let index = 0; index < count; index++) {
        scope
          .bind(service)
          .toResolvedValue(
            (context) => (count > 1 ? context.getAll(service)[index] : context.get(service)),
            [Context]
          )
          .inRequestScope();
      }
    }
  }

  private getServicesCount(scope: Container, service: ServiceIdentifier<unknown>) {
    return this.services.get(scope)?.get(service) ?? 0;
  }

  private incrementServicesCount(scope: Container, service: ServiceIdentifier<unknown>) {
    if (!this.services.has(scope)) {
      this.services.set(scope, new Map());
    }

    this.services.get(scope)?.set(service, this.getServicesCount(scope, service) + 1);
  }
}
