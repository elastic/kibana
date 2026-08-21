/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type Container,
  ContainerModule,
  type ContainerModuleLoadOptions,
  type GetOptions,
  type GetAllOptions,
  LazyServiceIdentifier,
  type MapToResolvedValueInjectOptions,
  type ResolutionContext,
  type ResolvedValueInjectOptions,
  type ServiceIdentifier,
} from 'inversify';
import { once } from 'lodash';
import { OnSetup, OnStart } from './services/plugin';

/**
 * Extended container module options providing Kibana-specific features.
 */
export interface KibanaContainerModuleLoadOptions extends ContainerModuleLoadOptions {
  /**
   * Registers a handler that will be called after the setup phase against every bound service.
   * @param serviceIdentifier The service identifier to bind the handler to.
   * @param dependencies Dependencies to resolve before calling the handler.
   * @param handler The handler to perform an action with the service instance.
   */
  onSetup<T, A extends unknown[] = any[]>(
    serviceIdentifier: ServiceIdentifier<T>,
    ...args: [...dependencies: MapToResolvedValueInjectOptions<A>, handler: KibanaHandler<T, A>]
  ): void;

  /**
   * Registers a handler that will be called after the start phase against every bound service.
   * @param serviceIdentifier The service identifier to bind the handler to.
   * @param dependencies Dependencies to resolve before calling the handler.
   * @param handler The handler to perform an action with the service instance.
   */
  onStart<T, A extends unknown[] = any[]>(
    serviceIdentifier: ServiceIdentifier<T>,
    ...args: [...dependencies: MapToResolvedValueInjectOptions<A>, handler: KibanaHandler<T, A>]
  ): void;

  /**
   * Wraps a handler that will be called after the start phase injecting the listed dependencies.
   * The returned function can be used in dynamic bindings like `toDynamicValue` or `toFactory` or as an `onActivation` handler.
   * @example
   * ```ts
   * import { KibanaContainerModule } from '@kbn/core-di';
   *
   * export const module = new KibanaContainerModule(({ bind, inject }) => {
   *   bind(Token).toDynamicValue(inject(User, Key, (user, key) => getToken(user, key)));
   * });
   * ```
   * @param dependencies Dependencies to resolve before calling the inner function.
   * @param inner A function to wrap inside an asynchronous function.
   */
  inject<R, A extends unknown[], D extends unknown[]>(
    ...definition: [...dependencies: MapToResolvedValueInjectOptions<D>, inner: Injectable<R, A, D>]
  ): (context: Pick<ResolutionContext, 'getAsync' | 'getAllAsync'>, ...args: A) => Promise<R>;
}

export type KibanaHandler<T, A extends unknown[] = []> = (
  context: KibanaResolutionContext,
  injectable: T,
  ...services: A
) => void;

export interface KibanaResolutionContext extends ResolutionContext {
  /**
   * Wraps a handler that will be called after the start phase injecting the listed dependencies.
   * @example
   * ```ts
   * import { KibanaContainerModule } from '@kbn/core-di';
   *
   * export const module = new KibanaContainerModule(({ bind, inject }) => {
   *   bind(Route).onSetup(({ inject }, router, route) => {
   *     router.register(route, inject(CoreStart('elasticsearch'), (client, request, response) => {
   *       return client.search(request.body);
   *     });
   *   }, Router);
   * });
   * ```
   * @param dependencies Dependencies to resolve before calling the inner function.
   * @param handler A function to wrap inside an asynchronous function.
   */
  inject<R, A extends unknown[], D extends unknown[]>(
    ...args: [...dependencies: MapToResolvedValueInjectOptions<D>, inner: Injectable<R, A, D>]
  ): (...args: A) => Promise<R>;
}

export type Injectable<R, A extends unknown[], D extends unknown[]> = (
  ...args: [...dependencies: D, ...arguments: A]
) => Promise<R> | R;

interface NormalizedResolutionOptions<T> extends GetOptions, GetAllOptions {
  serviceIdentifier: ServiceIdentifier<T>;
  isMultiple?: boolean;
}

function normalizeResolutionOptions<T>(
  request: ResolvedValueInjectOptions<T>
): NormalizedResolutionOptions<T> {
  if (typeof request !== 'object') {
    return { serviceIdentifier: request };
  }

  if (LazyServiceIdentifier.is(request)) {
    return { serviceIdentifier: request.unwrap() };
  }

  return {
    ...request,
    serviceIdentifier: LazyServiceIdentifier.is<T>(request.serviceIdentifier)
      ? request.serviceIdentifier.unwrap()
      : (request.serviceIdentifier as ServiceIdentifier<T>),
  };
}

function resolveSync<A extends unknown[]>(
  context: Pick<ResolutionContext, 'get' | 'getAll'>,
  services: MapToResolvedValueInjectOptions<A>
): A {
  return services.map((service) => {
    const { serviceIdentifier, isMultiple, ...options } = normalizeResolutionOptions(service);

    return isMultiple
      ? context.getAll(serviceIdentifier, options)
      : context.get(serviceIdentifier, options);
  }) as A;
}

function resolveAsync<A extends unknown[]>(
  context: Pick<ResolutionContext, 'getAsync' | 'getAllAsync'>,
  services: MapToResolvedValueInjectOptions<A>
): Promise<A> {
  return Promise.all(
    services.map((service) => {
      const { serviceIdentifier, isMultiple, ...options } = normalizeResolutionOptions(service);

      return isMultiple
        ? context.getAllAsync(serviceIdentifier, options)
        : context.getAsync(serviceIdentifier, options);
    })
  ) as Promise<A>;
}

function toKibanaContainerModuleLoadOptions(
  options: ContainerModuleLoadOptions
): KibanaContainerModuleLoadOptions {
  const started = new Promise((resolve) => {
    const id = options
      .bind(OnStart)
      .toConstantValue(
        once((container) => {
          resolve(container);
          options.unbind(id);
        })
      )
      .getIdentifier();
  });

  function toKibanaResolutionContext(context: ResolutionContext): KibanaResolutionContext {
    return {
      ...context,
      inject: (...args) => inject(...args).bind(undefined, context),
    };
  }

  function onHook<T, A extends unknown[]>(
    hook: ServiceIdentifier<(container: Container) => void>,
    serviceIdentifier: ServiceIdentifier<T>,
    ...definition: [
      ...dependencies: MapToResolvedValueInjectOptions<A>,
      handler: KibanaHandler<T, A>
    ]
  ): void {
    options.onActivation(serviceIdentifier, (context, injectable) => {
      const handler = definition[definition.length - 1] as KibanaHandler<T, A>;
      const dependencies = definition.slice(0, -1) as MapToResolvedValueInjectOptions<A>;

      handler(
        ...([
          toKibanaResolutionContext(context),
          injectable,
          ...resolveSync(context, dependencies),
        ] as const)
      );

      return injectable;
    });
    options.bind(hook).toConstantValue((container) => {
      if (container.isCurrentBound(serviceIdentifier)) {
        container.getAll(serviceIdentifier);
      }
    });
  }

  function inject<R, A extends unknown[], D extends unknown[]>(
    ...definition: [
      ...dependencies: MapToResolvedValueInjectOptions<D>,
      handler: Injectable<R, A, D>
    ]
  ): (context: Pick<ResolutionContext, 'getAsync' | 'getAllAsync'>, ...args: A) => Promise<R> {
    return async (context, ...args) => {
      await started;
      const inner = definition[definition.length - 1] as Injectable<R, A, D>;
      const dependencies = definition.slice(0, -1) as MapToResolvedValueInjectOptions<D>;
      const resolvedDependencies = await resolveAsync(context, dependencies);

      return inner(...resolvedDependencies, ...args);
    };
  }

  return {
    ...options,
    inject,
    onSetup: onHook.bind(undefined, OnSetup) as KibanaContainerModuleLoadOptions['onSetup'],
    onStart: onHook.bind(undefined, OnStart) as KibanaContainerModuleLoadOptions['onStart'],
  };
}

/**
 * An extended container module that supports Kibana-specific features.
 */
export class KibanaContainerModule extends ContainerModule {
  constructor(load: (options: KibanaContainerModuleLoadOptions) => void | Promise<void>) {
    super((options) => load(toKibanaContainerModuleLoadOptions(options)));
  }
}
