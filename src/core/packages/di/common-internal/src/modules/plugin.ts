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
  Container,
  ContainerModule,
  type ContainerOptions,
  type ResolutionContext,
  type ServiceIdentifier,
} from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global, OnSetup, OnStart, Setup, Start } from '@kbn/core-di';

type ScopeFactory = (id?: PluginOpaqueId) => Container;

const Context = Symbol('Context') as ServiceIdentifier<Container>;
const Id = Symbol('Id') as ServiceIdentifier<PluginOpaqueId>;
const Parent = Symbol('Parent') as ServiceIdentifier<Container>;
export const Scope = Symbol.for('Scope') as ServiceIdentifier<ScopeFactory>;
export const Fork = Symbol.for('Fork') as ServiceIdentifier<ScopeFactory>;

export class PluginModule extends ContainerModule {
  private services = new WeakMap<Container, Map<ServiceIdentifier, number>>();
  private activated = {
    [OnSetup as symbol]: new WeakSet<Container>(),
    [OnStart as symbol]: new WeakSet<Container>(),
  };
  private bound = new WeakSet<Container>();

  constructor(root: Container, private readonly options?: Omit<ContainerOptions, 'parent'>) {
    super(({ bind, onActivation }) => {
      bind(Container).toConstantValue(root);
      bind(Fork).toDynamicValue(this.getForkFactory.bind(this)).inRequestScope();
      bind(OnSetup).toConstantValue(this.registerGlobals.bind(this));
      bind(Scope).toDynamicValue(this.getScopeFactory.bind(this)).inRequestScope();
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
    const container = get(Container);
    if (this.activated[hook as symbol].has(container)) {
      return contract;
    }

    for (
      let current: Container | undefined = container;
      current;
      current = current.get(Parent, { optional: true })
    ) {
      if (current.isCurrentBound(hook)) {
        current.getAll(hook).forEach((callback) => callback(container));
      }
    }

    this.activated[hook as symbol].add(container);

    return contract;
  }

  protected onGlobalActivation<T extends ServiceIdentifier>(
    { get }: ResolutionContext,
    service: T
  ): T {
    const scope = get(Container);
    const parent = get(Parent, { optional: true });
    const context = get(Context);
    const id = get(Id);
    const index = this.getServicesCount(scope, service);

    this.incrementServicesCount(scope, service);
    if (parent !== context) {
      this.incrementServicesCount(context, service);
    }

    context
      .bind(service)
      .toResolvedValue<[Container, Container | undefined]>(
        // eslint-disable-next-line @typescript-eslint/no-shadow
        (origin, context = origin) => {
          const target = context.get(Scope)(id);

          this.registerGlobals(origin);
          this.inheritGlobals(target);

          return this.getServicesCount(scope, service) > 1
            ? target.getAll(service)[index]
            : target.get(service);
        },
        [Container, { serviceIdentifier: Context, optional: true }]
      )
      .inRequestScope();

    return service;
  }

  protected getForkFactory({ get }: ResolutionContext): ScopeFactory {
    const container = get(Container);

    return (id) => {
      const fork = this.createChild(container);

      if (id) {
        fork.onDeactivation(
          id,
          once(() => fork.unbindAll())
        );
      }

      return fork.get(Scope)(id);
    };
  }

  protected getScopeFactory({ get }: ResolutionContext): ScopeFactory {
    const context = get(Container);

    return (id) => {
      if (!id) {
        return context;
      }

      if (!context.isCurrentBound(id)) {
        const parent = context.get(Parent, { optional: true })?.get(Scope)(id) ?? context;
        const scope = this.createChild(parent);

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

  protected registerGlobals(scope: Container) {
    if (this.bound.has(scope)) {
      return;
    }
    this.bound.add(scope);

    if (!scope.isCurrentBound(Global)) {
      return;
    }
    scope.getAll(Global);
  }

  private inheritGlobals(scope: Container) {
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

  private createChild(parent: Container) {
    const child = new Container({ ...this.options, parent });
    child.bind(Container).toConstantValue(child);
    child.bind(Parent).toConstantValue(parent);

    return child;
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
