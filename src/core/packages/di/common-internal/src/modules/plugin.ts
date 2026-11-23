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
import {
  createToken,
  OnReady,
  OnSetup,
  OnStart,
  Setup,
  SoftDependencies,
  Start,
} from '@kbn/core-di';

type ScopeFactory = (id?: PluginOpaqueId) => Container;

/**
 * Current context to resolve the global services.
 *
 * Some short-lived services, such as the current request, cannot be bound in the global scope, and hence, they are placed in a child container.
 * The `Context` service holds a reference to the child container and is used to resolve global services within the current context, making short-lived services available.
 */
const Context = Symbol('Context') as ServiceIdentifier<Container>;

/**
 * The service identifier for the global service references.
 */
export const Global = createToken<ServiceIdentifier>('Global');

/**
 * The plugin's `collect` hooks, run once after every plugin started and before any `OnReady` hook.
 */
export const Collect = createToken<(container: Container) => void>('core.di.Collect');

/**
 * The bindings one plugin exposed for a token, or the error building them threw.
 */
export type Contribution<T> = { plugin: string } & (
  | { status: 'fulfilled'; value: T[] }
  | { status: 'rejected'; reason: unknown }
);

/**
 * Resolves the bindings every plugin exposed for a token, one settled entry per plugin.
 */
export const Contributions =
  createToken<<T>(serviceIdentifier: ServiceIdentifier<T>) => Array<Contribution<T>>>(
    'core.di.Contributions'
  );

/**
 * `pending`: plugins run setup and start. `ready`: every plugin started.
 */
type Phase = 'pending' | 'ready';

/**
 * Current plugin scope identifier.
 *
 * This service is used to determine the current plugin scope identifier when resolving global services.
 * When the request originates from the forked context, it will be used to resolve the requested global service within the corresponding plugin scope of the forked context.
 */
const Id = Symbol('Id') as ServiceIdentifier<PluginOpaqueId>;

/**
 * Reference to the parent container.
 *
 * This is a workaround as there is no built-in way to resolve the parent container.
 */
const Parent = Symbol('Parent') as ServiceIdentifier<Container>;

/**
 * Plugin scope factory.
 *
 * The factory creates a new container for the plugin dependencies.
 * Services registered in this scope are not visible outside unless they are explicitely exposed using the `Global` symbol.
 */
export const Plugin = createToken<ScopeFactory>('Plugin');

/**
 * Isolated child context factory.
 *
 * This factory creates an intermediate or temporary child container to handle HTTP requests or other short-lived operations.
 */
export const Fork = createToken<ScopeFactory>('Fork');

export class PluginModule extends ContainerModule {
  private services = new WeakMap<Container, Map<ServiceIdentifier, number>>();
  private activated = {
    [OnSetup as symbol]: new WeakSet<Container>(),
    [OnStart as symbol]: new WeakSet<Container>(),
  };
  private bound = new WeakSet<Container>();
  private scopes = new Set<Container>();
  private phase: Phase = 'pending';

  constructor(
    private readonly root: Container,
    private readonly options?: Omit<ContainerOptions, 'parent'>
  ) {
    super(({ bind, onActivation }) => {
      bind(Container).toConstantValue(root);
      bind(Contributions).toConstantValue(this.getContributions.bind(this));
      bind(Fork).toDynamicValue(this.getForkFactory.bind(this)).inRequestScope();
      bind(OnSetup).toConstantValue(this.registerGlobals.bind(this));
      bind(Plugin).toDynamicValue(this.getPluginFactory.bind(this)).inRequestScope();
      bind(SoftDependencies)
        .toResolvedValue<[Container, Container | undefined]>(this.getSoftDependencies.bind(this), [
          Container,
          { serviceIdentifier: Context, optional: true },
        ])
        .inRequestScope();
      bind(Setup).toResolvedValue(this.getDefaultContract.bind(this)).inRequestScope();
      bind(Start).toResolvedValue(this.getDefaultContract.bind(this)).inRequestScope();
      onActivation(Global, this.onGlobalActivation.bind(this));
      onActivation(Setup, this.onContractActivation.bind(this, OnSetup));
      onActivation(Start, this.onContractActivation.bind(this, OnStart));
    });
  }

  /**
   * Marks every plugin as started, so `SoftDependencies` can resolve services exposed by any of them,
   * then runs each plugin's `collect` hooks once, then each plugin's `OnReady` hooks once.
   */
  public ready(): void {
    if (this.phase === 'ready') {
      return;
    }

    this.phase = 'ready';
    this.runHooks(Collect);
    this.runHooks(OnReady);
  }

  protected getDefaultContract() {
    return undefined;
  }

  protected getContributions<T>(serviceIdentifier: ServiceIdentifier<T>): Array<Contribution<T>> {
    if (this.phase !== 'ready') {
      throw new Error(`Cannot collect "${String(serviceIdentifier)}" before all plugins started.`);
    }

    return [...this.scopes].flatMap((scope): Array<Contribution<T>> => {
      const count = this.getServicesCount(scope, serviceIdentifier);
      if (!count) {
        return [];
      }

      const id = scope.get(Id);
      const plugin = id.description ?? String(id);
      try {
        const value = count > 1 ? scope.getAll(serviceIdentifier) : [scope.get(serviceIdentifier)];

        return [{ plugin, status: 'fulfilled', value }];
      } catch (reason) {
        return [{ plugin, status: 'rejected', reason }];
      }
    });
  }

  protected getSoftDependencies(origin: Container, context = origin): SoftDependencies {
    const assertReady = (serviceIdentifier: ServiceIdentifier) => {
      if (this.phase !== 'ready') {
        throw new Error(
          `Cannot resolve soft dependency "${String(
            serviceIdentifier
          )}" before all plugins started. Resolve it in an OnReady hook, a request handler, or later.`
        );
      }
    };

    return {
      get: (serviceIdentifier) => {
        assertReady(serviceIdentifier);

        return origin.get(serviceIdentifier, { optional: true });
      },
      getAll: (serviceIdentifier) => {
        assertReady(serviceIdentifier);

        return context.getAll(serviceIdentifier, { optional: true });
      },
    };
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

    container.getAll(hook, { chained: true }).forEach((callback) => callback(container));
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
          const target = context.get(Plugin)(id);

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
          once(() => fork.unbindAllAsync())
        );
      }

      return fork.get(Plugin)(id);
    };
  }

  protected getPluginFactory({ get }: ResolutionContext): ScopeFactory {
    const context = get(Container);

    return (id) => {
      if (!id) {
        return context;
      }

      if (!context.isCurrentBound(id)) {
        const parent = context.get(Parent, { optional: true })?.get(Plugin)(id) ?? context;
        const scope = this.createChild(parent);

        scope.bind(Id).toConstantValue(id);
        scope
          .bind(Context)
          .toConstantValue(context)
          .onDeactivation(once(() => context.unbindAsync(id).catch(noop)));
        scope.get(Context);

        context
          .bind(id)
          .toConstantValue(scope)
          .onDeactivation(
            once(() => {
              this.scopes.delete(scope);

              return scope.unbindAllAsync();
            })
          );

        if (context === this.root) {
          this.scopes.add(scope);
        }
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

  private runHooks(hook: ServiceIdentifier<(container: Container) => void>) {
    for (const scope of [...this.scopes]) {
      if (scope.isCurrentBound(hook)) {
        scope.getAll(hook).forEach((callback) => callback(scope));
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
