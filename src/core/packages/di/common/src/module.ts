/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type BindingActivation,
  type BindInWhenOnFluentSyntax,
  type BindToFluentSyntax,
  type BindWhenOnFluentSyntax,
  ContainerModule,
  type ContainerModuleLoadOptions,
  type DynamicValueBuilder,
  type Factory,
  type MapToResolvedValueInjectOptions,
  type ResolutionContext,
  type ServiceIdentifier,
} from 'inversify';
import { toKibanaContainerModuleLoadOptions } from '@kbn/core-di-internal';

/**
 * Extended container module options providing Kibana-specific features.
 * @public
 */
export interface KibanaContainerModuleLoadOptions extends ContainerModuleLoadOptions {
  /**
   * An extended binding supporting Kibana-specific features.
   */
  bind: KibanaBind;

  /**
   * Registers a handler that will be called after the service activation.
   * @param serviceIdentifier The service identifier to register the handler to.
   * @param activation The handler to perform an action with the service instance.
   */
  onActivation<T>(
    serviceIdentifier: ServiceIdentifier<T>,
    activation: KibanaBindingActivation<T>
  ): void;

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

/**
 * An extended binding supporting Kibana-specific features.
 * @public
 */
export type KibanaBind = <T>(
  serviceIdentifier: ServiceIdentifier<T>
) => KibanaBindToFluentSyntax<T>;

/**
 * An extended fluent binding syntax supporting Kibana-specific features.
 * @public
 */
export interface KibanaBindToFluentSyntax<T> extends BindToFluentSyntax<T> {
  /**
   * A dynamic value binding supporting Kibana resolution context.
   * @param builder A function that will be called to resolve the value of the binding.
   */
  toDynamicValue(builder: KibanaDynamicValueBuilder<T>): BindInWhenOnFluentSyntax<T>;

  /**
   * A factory binding supporting Kibana resolution context.
   * @param factory A function that will be called to resolve the value of the binding.
   */
  toFactory(
    factory: T extends Factory<unknown, any> ? KibanaFactory<T> : never
  ): BindWhenOnFluentSyntax<T>;
}

/**
 * A dynamic value builder supporting Kibana resolution context.
 * @public
 */
export type KibanaDynamicValueBuilder<T> = (
  context: KibanaResolutionContext
) => ReturnType<DynamicValueBuilder<T>>;

/**
 * A factory supporting Kibana resolution context.
 * @public
 */
export type KibanaFactory<T> = (context: KibanaResolutionContext) => T | Promise<T>;

/**
 * A handler that will be called after the setup or start phase injecting the listed dependencies.
 * @public
 */
export type KibanaHandler<T, A extends unknown[] = [], R = void> = (
  context: KibanaResolutionContext,
  injectable: T,
  ...services: A
) => R;

/**
 * An extended binding activation handler supporting Kibana resolution context.
 * @public
 */
export type KibanaBindingActivation<T = unknown> = (
  context: KibanaResolutionContext,
  injectable: T
) => ReturnType<BindingActivation<T>>;

/**
 * An extended resolution context providing Kibana-specific features.
 * @public
 */
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

/**
 * A function that can be injected with dependencies and arguments.
 * @public
 */
export type Injectable<R, A extends unknown[], D extends unknown[]> = (
  ...args: [...dependencies: D, ...arguments: A]
) => Promise<R> | R;

/**
 * An extended container module that supports Kibana-specific features.
 * @public
 */
export class KibanaContainerModule extends ContainerModule {
  constructor(load: (options: KibanaContainerModuleLoadOptions) => void | Promise<void>) {
    super((options) => load(toKibanaContainerModuleLoadOptions(options)));
  }
}
