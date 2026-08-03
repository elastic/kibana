/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type BindToFluentSyntax,
  type Container,
  ContainerModule,
  type ContainerModuleLoadOptions,
  LazyServiceIdentifier,
  type MapToResolvedValueInjectOptions,
  type ResolutionContext,
  type ServiceIdentifier,
} from 'inversify';
import { OnSetup, OnStart } from './services/plugin';

export type KibanaBind = <T>(
  serviceIdentifier: ServiceIdentifier<T>
) => KibanaBindToFluentSyntax<T>;
export type KibanaHandler<T, A extends unknown[] = []> = (
  context: ResolutionContext,
  injectable: T,
  ...services: A
) => void;

export interface KibanaBindToFluentSyntax<T> extends BindToFluentSyntax<T> {
  /**
   * Binds a handler that will be called after the setup phase against every bound service.
   * @param handler The handler to perform an action with the service instance.
   * @param dependencies Dependencies to resolve before calling the handler.
   */
  onSetup<A extends unknown[] = any[]>(
    handler: KibanaHandler<T, A>,
    ...dependencies: MapToResolvedValueInjectOptions<A>
  ): void;

  /**
   * Binds a handler that will be called after the start phase against every bound service.
   * @param handler The handler to perform an action with the service instance.
   * @param dependencies Dependencies to resolve before calling the handler.
   */
  onStart<A extends unknown[] = any[]>(
    handler: KibanaHandler<T, A>,
    ...dependencies: MapToResolvedValueInjectOptions<A>
  ): void;
}

/**
 * Extended container module options providing Kibana-specific features.
 */
export interface KibanaContainerModuleLoadOptions extends ContainerModuleLoadOptions {
  /**
   * An extended binding supporting Kibana-specific features.
   */
  bind: KibanaBind;
}

/**
 * An extended container module that supports Kibana-specific features.
 */
export class KibanaContainerModule extends ContainerModule {
  constructor(load: (options: KibanaContainerModuleLoadOptions) => void | Promise<void>) {
    super((options) =>
      load({
        ...options,
        bind: this.#bind.bind(this, options) as KibanaBind,
      })
    );
  }

  #bind<T>(
    options: ContainerModuleLoadOptions,
    serviceIdentifier: ServiceIdentifier<T>
  ): KibanaBindToFluentSyntax<T> {
    const fluentSyntax = options.bind(serviceIdentifier);

    Object.defineProperties(fluentSyntax, {
      onSetup: {
        value: this.#onHook.bind(this, OnSetup, options, serviceIdentifier),
      },
      onStart: {
        value: this.#onHook.bind(this, OnStart, options, serviceIdentifier),
      },
    });

    return fluentSyntax as KibanaBindToFluentSyntax<T>;
  }

  #onHook<T, A extends unknown[]>(
    hook: ServiceIdentifier<(container: Container) => void>,
    { bind, onActivation }: ContainerModuleLoadOptions,
    serviceIdentifier: ServiceIdentifier<T>,
    handler: KibanaHandler<T, A>,
    ...dependences: MapToResolvedValueInjectOptions<A>
  ): void {
    onActivation(serviceIdentifier, (context, injectable) => {
      handler.apply(undefined, [context, injectable, ...this.#resolve(context, dependences)]);

      return injectable;
    });
    bind(hook).toConstantValue((container) => {
      container.getAll(serviceIdentifier);
    });
  }

  #resolve<A extends unknown[]>(
    context: ResolutionContext,
    services: MapToResolvedValueInjectOptions<A>
  ): A {
    return services.map((service) => {
      if (typeof service !== 'object') {
        return context.get(service);
      }

      if (LazyServiceIdentifier.is(service)) {
        return context.get(service.unwrap());
      }

      const serviceIdentifier = LazyServiceIdentifier.is(service.serviceIdentifier)
        ? service.serviceIdentifier.unwrap()
        : service.serviceIdentifier;
      const method = (service as typeof service & { isMultiple: boolean }).isMultiple
        ? 'getAll'
        : 'get';

      return context[method](serviceIdentifier, service);
    }) as A;
  }
}
