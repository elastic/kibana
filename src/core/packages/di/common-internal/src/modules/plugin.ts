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
import { OnSetup, OnStart, Setup, Start } from '@kbn/core-di';

// Cross-plugin marker symbols. The `Symbol.for(...)` string key is a stable,
// well-known protocol: other packages (e.g. `@kbn/plugin-di`) re-create the same
// key via the global symbol registry rather than importing these bindings, so
// they participate without a hard dependency on `@kbn/core-di` internals. Keep
// the keys stable.
export const ProvidedService = Symbol.for(
  'ProvidedService'
) as ServiceIdentifier<ServiceIdentifier>;
export const HostedExtensionPoint = Symbol.for(
  'HostedExtensionPoint'
) as ServiceIdentifier<ServiceIdentifier>;
export const ContributedExtensionPoint = Symbol.for(
  'ContributedExtensionPoint'
) as ServiceIdentifier<ServiceIdentifier>;

/**
 * @deprecated Superseded by the more specific {@link ProvidedService},
 * {@link HostedExtensionPoint}, and {@link ContributedExtensionPoint} markers.
 * Retained as an alias of {@link ProvidedService} for backward compatibility.
 */
export const Global = ProvidedService;

type ScopeFactory = (id?: PluginOpaqueId) => Container;

/**
 * Current context to resolve the global services.
 *
 * Some short-lived services, such as the current request, cannot be bound in the
 * shared scope, and hence, they are placed in a child container. The `Context`
 * service holds a reference to the child container and is used to resolve
 * cross-plugin services and extension-point contributions within the current
 * context, making short-lived services available.
 */
const Context = Symbol('Context') as ServiceIdentifier<Container>;

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
 * Services registered in this scope are not visible outside unless they are
 * explicitly exposed using the cross-plugin marker symbols.
 */
export const Scope = Symbol.for('Scope') as ServiceIdentifier<ScopeFactory>;

/**
 * Isolated child context factory.
 *
 * This factory creates an intermediate or temporary child container to handle HTTP requests or other short-lived operations.
 */
export const Fork = Symbol.for('Fork') as ServiceIdentifier<ScopeFactory>;

export class PluginModule extends ContainerModule {
  private serviceCounts = new WeakMap<Container, Map<ServiceIdentifier, number>>();
  private extensionCounts = new WeakMap<Container, Map<ServiceIdentifier, number>>();
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
      onActivation(ProvidedService, this.onProvidedServiceActivation.bind(this));
      onActivation(HostedExtensionPoint, this.onHostedExtensionPointActivation.bind(this));
      onActivation(
        ContributedExtensionPoint,
        this.onContributedExtensionPointActivation.bind(this)
      );
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

    container.getAll(hook, { chained: true }).forEach((callback) => callback(container));
    this.activated[hook as symbol].add(container);

    return contract;
  }

  protected onProvidedServiceActivation<T extends ServiceIdentifier>(
    { get }: ResolutionContext,
    service: T
  ): T {
    const scope = get(Container);
    const context = get(Context, { optional: true });
    const index = this.getServiceCount(scope, service);

    this.incrementCount(this.serviceCounts, scope, service);

    // A fork without a plugin `Context` (e.g. an HTTP request or app-mount
    // scope bound via `Fork`) is its own context: the service is already bound
    // here and is inherited by its child plugin scopes, so there is no parent
    // context to promote it to.
    if (!context) {
      return service;
    }

    const parent = get(Parent, { optional: true });
    const id = get(Id);
    if (parent !== context) {
      this.incrementCount(this.serviceCounts, context, service);
    }

    context
      .bind(service)
      .toResolvedValue<[Container, Container | undefined]>(
        // eslint-disable-next-line @typescript-eslint/no-shadow
        (origin, context = origin) => {
          const target = context.get(Scope)(id);

          this.registerGlobals(origin);
          this.inheritGlobals(target);

          return this.getServiceCount(scope, service) > 1
            ? target.getAll(service)[index]
            : target.get(service);
        },
        [Container, { serviceIdentifier: Context, optional: true }]
      )
      .inRequestScope();

    return service;
  }

  protected onContributedExtensionPointActivation<T extends ServiceIdentifier>(
    { get }: ResolutionContext,
    extensionPoint: T
  ): T {
    const scope = get(Container);
    const context = get(Context, { optional: true });
    const index = this.getExtensionCount(scope, extensionPoint);

    this.incrementCount(this.extensionCounts, scope, extensionPoint);

    // See `onProvidedServiceActivation`: a context-less fork is its own context
    // and needs no promotion to a parent context.
    if (!context) {
      return extensionPoint;
    }

    const parent = get(Parent, { optional: true });
    const id = get(Id);
    if (parent !== context) {
      this.incrementCount(this.extensionCounts, context, extensionPoint);
    }

    context
      .bind(extensionPoint)
      .toResolvedValue<[Container, Container | undefined]>(
        (origin, requestContext = origin) => {
          const target = requestContext.get(Scope)(id);

          this.registerGlobals(origin);
          this.inheritGlobals(target);

          return target.getAll(extensionPoint)[index];
        },
        [Container, { serviceIdentifier: Context, optional: true }]
      )
      .inRequestScope();

    return extensionPoint;
  }

  protected onHostedExtensionPointActivation<T extends ServiceIdentifier>(
    _context: ResolutionContext,
    extensionPoint: T
  ): T {
    return extensionPoint;
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

    if (scope.isCurrentBound(ProvidedService)) {
      scope.getAll(ProvidedService);
    }
    if (scope.isCurrentBound(HostedExtensionPoint)) {
      scope.getAll(HostedExtensionPoint);
    }
    if (scope.isCurrentBound(ContributedExtensionPoint)) {
      scope.getAll(ContributedExtensionPoint);
    }
  }

  private inheritGlobals(scope: Container) {
    if (this.bound.has(scope)) {
      return;
    }
    this.bound.add(scope);

    for (const [service, count] of this.serviceCounts.get(scope.get(Context)) ?? []) {
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

    for (const [extensionPoint, count] of this.extensionCounts.get(scope.get(Context)) ?? []) {
      for (let index = 0; index < count; index++) {
        scope
          .bind(extensionPoint)
          .toResolvedValue((context) => context.getAll(extensionPoint)[index], [Context])
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

  private getServiceCount(scope: Container, service: ServiceIdentifier<unknown>) {
    return this.serviceCounts.get(scope)?.get(service) ?? 0;
  }

  private getExtensionCount(scope: Container, extensionPoint: ServiceIdentifier<unknown>) {
    return this.extensionCounts.get(scope)?.get(extensionPoint) ?? 0;
  }

  private incrementCount(
    counts: WeakMap<Container, Map<ServiceIdentifier, number>>,
    scope: Container,
    service: ServiceIdentifier<unknown>
  ) {
    if (!counts.has(scope)) {
      counts.set(scope, new Map());
    }

    counts.get(scope)?.set(service, (counts.get(scope)?.get(service) ?? 0) + 1);
  }
}
