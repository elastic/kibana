/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ContainerModule,
  type ContainerModuleLoadOptions,
  type ServiceIdentifier,
} from 'inversify';

/**
 * Token that marks a service for cross-plugin visibility.
 *
 * Mirrors the symbol defined in `@kbn/core-di-internal`; both resolve
 * to the same `Symbol.for('Global')` value at runtime.
 * @public
 */
export const Global = Symbol.for('Global') as ServiceIdentifier<ServiceIdentifier>;

/**
 * Callback options passed to {@link declareServices}, extending the standard
 * Inversify `ContainerModuleLoadOptions` with a `publish` helper.
 * @public
 */
export interface DeclareServicesOptions extends ContainerModuleLoadOptions {
  /**
   * Binds a token and marks it for cross-plugin (global) visibility in a single call.
   *
   * **Two-argument form** — bind and mark for global visibility, then chain additional
   * binding configuration (`.to()`, `.toConstantValue()`, etc.):
   * ```ts
   * publish(MyToken).to(MyService);
   * ```
   *
   * **Three-argument form (Start shorthand)** — a convenience for plugins that expose
   * their classic plugin contract as a global service.  Equivalent to
   * `publish(token).toResolvedValue(mapper, [from])` but more concise:
   * ```ts
   * publish(MyToken, Start, (start) => start.getMyService());
   * ```
   *
   * @returns The binding fluent chain (two-argument form only).
   */
  publish: {
    <T>(token: ServiceIdentifier<T>): ReturnType<ContainerModuleLoadOptions['bind']>;
    <T, TDep>(
      token: ServiceIdentifier<T>,
      from: ServiceIdentifier<TDep>,
      mapper: (dep: TDep) => T
    ): void;
  };
}

/**
 * Declares the services a plugin provides.
 *
 * Use `publish` for services that should be visible to other plugins and
 * `bind` for services local to the plugin scope.
 *
 * @example Bind an implementation class directly:
 * ```ts
 * export const services = declareServices(({ bind, publish }) => {
 *   publish(MyServiceToken).to(MyService);
 *   bind(Route).toConstantValue(MyRoute);
 * });
 * ```
 *
 * @example Expose a classic plugin start contract globally (three-argument shorthand):
 * ```ts
 * export const services = declareServices(({ publish }) => {
 *   publish(MyServiceToken, Start, (start) => start.getMyService());
 * });
 * ```
 *
 * @returns A `ContainerModule` the platform loads during plugin setup.
 * @public
 */
export const declareServices = (
  callback: (options: DeclareServicesOptions) => void
): ContainerModule =>
  new ContainerModule((options) => {
    function publish<T>(token: ServiceIdentifier<T>): ReturnType<ContainerModuleLoadOptions['bind']>;
    function publish<T, TDep>(
      token: ServiceIdentifier<T>,
      from: ServiceIdentifier<TDep>,
      mapper: (dep: TDep) => T
    ): void;
    function publish<T, TDep>(
      token: ServiceIdentifier<T>,
      from?: ServiceIdentifier<TDep>,
      mapper?: (dep: TDep) => T
    ): ReturnType<ContainerModuleLoadOptions['bind']> | void {
      options.bind(Global).toConstantValue(token);
      if (from !== undefined && mapper !== undefined) {
        options.bind(token).toResolvedValue(mapper, [from]);
        return;
      }
      return options.bind(token);
    }
    callback({ ...options, publish });
  });
