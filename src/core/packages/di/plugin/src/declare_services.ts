/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Start, type ExtensionPointToken, type ServiceToken } from '@kbn/core-di';
import {
  ContainerModule,
  type ContainerModuleLoadOptions,
  type Newable,
  type ServiceIdentifier,
} from 'inversify';

/**
 * Internal marker for cross-plugin services.
 *
 * This mirrors the symbol used by the core runtime. The public helper package
 * intentionally stays decoupled from core internals while using the same
 * `Symbol.for(...)` marker name.
 */
const ProvidedService = Symbol.for('ProvidedService') as ServiceIdentifier<ServiceToken<unknown>>;

/**
 * Internal marker for hosted extension points.
 */
const HostedExtensionPoint = Symbol.for('HostedExtensionPoint') as ServiceIdentifier<
  ExtensionPointToken<unknown>
>;

/**
 * Internal marker for extension point contributions.
 */
const ContributedExtensionPoint = Symbol.for('ContributedExtensionPoint') as ServiceIdentifier<
  ExtensionPointToken<unknown>
>;

/**
 * Callback options passed to {@link declare}, extending the standard
 * Inversify `ContainerModuleLoadOptions` with plugin-author convenience
 * helpers.
 *
 * This is a proposed DX layer for the cross-plugin DI PoC, not a finalized
 * API. Plain `ContainerModule` usage remains valid.
 * @public
 */
export interface DeclareOptions extends ContainerModuleLoadOptions {
  /**
   * Binds a service token and marks it for cross-plugin visibility.
   *
   * @param token - The {@link ServiceToken} to bind.
   * @returns A {@link TokenBinding} with chainable helpers for completing the binding.
   */
  provide<T>(token: ServiceToken<T>): TokenBinding<T>;

  /**
   * Marks an extension point as hosted by the current plugin.
   *
   * @param extensionPoint - The {@link ExtensionPointToken} to host.
   */
  host<T>(extensionPoint: ExtensionPointToken<T>): void;

  /**
   * Binds a contribution to an extension point and marks it for cross-plugin visibility.
   *
   * @param extensionPoint - The {@link ExtensionPointToken} to contribute to.
   * @returns A {@link TokenBinding} with chainable helpers for completing the binding.
   */
  contribute<T>(extensionPoint: ExtensionPointToken<T>): TokenBinding<T>;
}

/**
 * Chainable binding helpers for plugin-di declarations.
 *
 * The explicit `provide(...)`, `host(...)`, and `contribute(...)` operations
 * are meant to be easy to read and safe to copy between plugins.
 * @public
 */
export interface TokenBinding<T> {
  /**
   * Returns the raw InversifyJS binding builder for the token, allowing
   * advanced binding strategies not covered by the shorthand helpers.
   *
   * @returns The InversifyJS binding builder for the token.
   */
  bind(): ReturnType<ContainerModuleLoadOptions['bind']>;

  /**
   * Resolves the token by mapping an existing `dependency` from the container.
   *
   * @param dependency - {@link ServiceIdentifier} of the dependency to resolve.
   * @param mapper - Pure function that transforms the resolved dependency value into `T`.
   */
  from<TDep>(dependency: ServiceIdentifier<TDep>, mapper: (dep: TDep) => T): void;

  /**
   * Resolves the token by mapping the plugin start contract.
   *
   * The {@link Start} sentinel is used as the dependency source, so this
   * binding is only valid after the plugin's start lifecycle has run.
   *
   * @param mapper - Pure function that transforms the start contract into `T`.
   */
  fromStart<TStart>(mapper: (start: TStart) => T): void;

  /**
   * Binds the token to an injectable class.
   *
   * InversifyJS will instantiate `implementation` and inject its constructor
   * dependencies on every resolution.
   *
   * @param implementation - A {@link Newable} class whose constructor signature
   *   produces a value compatible with `T`.
   */
  to<TImplementation extends T>(implementation: Newable<TImplementation>): void;

  /**
   * Binds the token to a pre-constructed constant value.
   *
   * @param value - The singleton value returned on every resolution.
   */
  toConstantValue(value: T): void;
}

const createTokenBinding = <T>(
  options: ContainerModuleLoadOptions,
  marker: ServiceIdentifier<ServiceIdentifier<unknown>>,
  token: ServiceIdentifier<T>
): TokenBinding<T> => {
  let isMarked = false;
  const mark = () => {
    if (!isMarked) {
      options.bind(marker).toConstantValue(token);
      isMarked = true;
    }
  };

  return {
    bind() {
      mark();
      return options.bind(token);
    },
    from<TDep>(dependency: ServiceIdentifier<TDep>, mapper: (dep: TDep) => T) {
      mark();
      options.bind(token).toResolvedValue(mapper, [dependency]);
    },
    fromStart<TStart>(mapper: (start: TStart) => T) {
      mark();
      options.bind(token).toResolvedValue(mapper, [Start as ServiceIdentifier<TStart>]);
    },
    to<TImplementation extends T>(implementation: Newable<TImplementation>) {
      mark();
      options.bind(token).to(implementation);
    },
    toConstantValue(value: T) {
      mark();
      options.bind(token).toConstantValue(value);
    },
  };
};

/**
 * Declares a plugin's DI bindings as an InversifyJS `ContainerModule`.
 *
 * This helper is optional authoring sugar for the DI PoC. Plugins may always
 * fall back to plain InversifyJS `ContainerModule` definitions if they prefer.
 *
 * @example
 * ```ts
 * import { declare } from '@kbn/core-di-plugin';
 * import { MyServiceToken, MyExtensionPointToken } from '../tokens';
 *
 * export const module = declare(({ contribute, host, provide }) => {
 *   provide(MyServiceToken).to(MyServiceImpl);
 *   host(MyExtensionPointToken);
 *   contribute(MyExtensionPointToken).toConstantValue(myContribution);
 * });
 * ```
 *
 * @param callback - Receives {@link DeclareOptions} and registers bindings.
 *   The callback is invoked synchronously when the module is loaded into a
 *   container.
 * @public
 */
export const declare = (callback: (options: DeclareOptions) => void): ContainerModule =>
  new ContainerModule((options) => {
    const provide = <T>(token: ServiceToken<T>): TokenBinding<T> =>
      createTokenBinding(
        options,
        ProvidedService as ServiceIdentifier<ServiceIdentifier<unknown>>,
        token
      );

    const host = <T>(extensionPoint: ExtensionPointToken<T>): void => {
      options.bind(HostedExtensionPoint).toConstantValue(extensionPoint);
    };

    const contribute = <T>(extensionPoint: ExtensionPointToken<T>): TokenBinding<T> =>
      createTokenBinding(
        options,
        ContributedExtensionPoint as ServiceIdentifier<ServiceIdentifier<unknown>>,
        extensionPoint
      );

    callback({
      ...options,
      contribute,
      host,
      provide,
    });
  });
