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
  type BindToFluentSyntax,
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

const fulfillmentBrand: unique symbol = Symbol('fulfillmentBrand');

/**
 * A binding strategy for a `provide(...)` or `contribute(...)` call, produced by
 * one of the helpers ({@link implementedBy}, {@link withValue},
 * {@link fromToken}, {@link using}).
 *
 * `T` is carried only by {@link Fulfillment.configure}, so the brand never needs
 * a runtime value for an arbitrary `T`.
 * @public
 */
export interface Fulfillment<T> {
  readonly [fulfillmentBrand]: true;
  configure(bindTo: BindToFluentSyntax<T>): void;
}

const createFulfillment = <T>(
  configure: (bindTo: BindToFluentSyntax<T>) => void
): Fulfillment<T> => ({
  [fulfillmentBrand]: true,
  configure,
});

const isFulfillment = <T>(source: unknown): source is Fulfillment<T> =>
  typeof source === 'object' &&
  source !== null &&
  (source as { [fulfillmentBrand]?: unknown })[fulfillmentBrand] === true;

/**
 * Resolution scope for a class-backed binding. Defaults to `'singleton'`.
 * @public
 */
export type FulfillmentScope = 'singleton' | 'transient' | 'request';

/**
 * Provides a token by having DI construct `implementation` and inject its
 * constructor dependencies. Bound `inSingletonScope()` unless `scope` overrides.
 *
 * @example
 * ```ts
 * provide(MyServiceToken, implementedBy(MyServiceImpl));
 * ```
 * @public
 */
export const implementedBy = <T>(
  implementation: Newable<T>,
  options?: { scope?: FulfillmentScope }
): Fulfillment<T> =>
  createFulfillment<T>((bindTo) => {
    const binding = bindTo.to(implementation);
    switch (options?.scope) {
      case 'transient':
        binding.inTransientScope();
        break;
      case 'request':
        binding.inRequestScope();
        break;
      default:
        binding.inSingletonScope();
        break;
    }
  });

/**
 * Provides a token (or contributes to an extension point) with a pre-constructed
 * constant value.
 *
 * @example
 * ```ts
 * provide(MyServiceToken, withValue(myService));
 * ```
 * @public
 */
export const withValue = <T>(value: T): Fulfillment<T> =>
  createFulfillment<T>((bindTo) => {
    bindTo.toConstantValue(value);
  });

/**
 * Provides a token by deriving its value from another container binding. Bound
 * `inSingletonScope()` so the derived value resolves as a single service value.
 *
 * @example
 * ```ts
 * provide(MyDerivedToken, fromToken(MySourceToken, (source) => source.derived));
 * ```
 * @public
 */
export const fromToken = <T, TDep>(
  dependency: ServiceIdentifier<TDep>,
  mapper: (dependency: TDep) => T
): Fulfillment<T> =>
  createFulfillment<T>((bindTo) => {
    bindTo.toResolvedValue(mapper, [dependency]).inSingletonScope();
  });

/**
 * Expert escape hatch: configure the raw InversifyJS binding builder directly
 * for strategies not covered by the named helpers (custom scope, factories,
 * activation, `when`, ...).
 *
 * @example
 * ```ts
 * provide(MyServiceToken, using((bindTo) => bindTo.to(MyServiceImpl).inRequestScope()));
 * ```
 * @public
 */
export const using = <T>(configure: (bindTo: BindToFluentSyntax<T>) => void): Fulfillment<T> =>
  createFulfillment<T>(configure);

/**
 * Default for the {@link declare} `TStart` parameter. Its string value surfaces
 * in the type error a contributor sees when they read from `start` without
 * passing their plugin start contract to `declare<MyPluginStart>(...)`.
 * @public
 */
export type RequiresPluginStart =
  'Pass your plugin start contract: declare<MyPluginStart>(({ provide }) => ...)';

/**
 * Callback options passed to {@link declare}. The surface is intentionally
 * narrowed to the cross-plugin helpers plus `bind`; raw Inversify members are
 * not exposed.
 *
 * This is a proposed DX layer for the cross-plugin DI PoC, not a finalized
 * API. Plain `ContainerModule` usage remains valid.
 * @public
 */
export interface DeclareOptions<TStart = RequiresPluginStart> {
  /**
   * Registers a local DI binding that is not a cross-plugin contract (e.g.
   * `Route`, `OnStart`, a plain `toSelf` service).
   */
  bind: ContainerModuleLoadOptions['bind'];

  /**
   * Provides a cross-plugin service and marks it for cross-plugin visibility.
   *
   * @param token - The {@link ServiceToken} to provide.
   * @param source - A selector projecting from this plugin's start contract, or
   *   a {@link Fulfillment} from {@link implementedBy}/{@link withValue}/
   *   {@link fromToken}/{@link using}.
   */
  provide<T>(
    token: ServiceToken<T>,
    source: ((start: TStart) => T) | Fulfillment<NoInfer<T>>
  ): void;

  /**
   * Marks an extension point as hosted by the current plugin.
   *
   * @param extensionPoint - The {@link ExtensionPointToken} to host.
   */
  host<T>(extensionPoint: ExtensionPointToken<T>): void;

  /**
   * Contributes to an extension point and marks it for cross-plugin visibility.
   *
   * @param extensionPoint - The {@link ExtensionPointToken} to contribute to.
   * @param source - The contribution value, or a {@link Fulfillment}.
   */
  contribute<T>(extensionPoint: ExtensionPointToken<T>, source: T | Fulfillment<NoInfer<T>>): void;
}

/**
 * Declares a plugin's DI bindings as an InversifyJS `ContainerModule`.
 *
 * This helper is optional authoring sugar for the DI PoC. Plugins may always
 * fall back to plain InversifyJS `ContainerModule` definitions if they prefer.
 *
 * Pass the plugin's own start contract as `TStart` so the `provide(...)`
 * selector is typed: `declare<MyPluginStart>(...)`.
 *
 * @example
 * ```ts
 * import { declare, implementedBy, using } from '@kbn/plugin-di';
 * import type { MyPluginStart } from './types';
 * import { MyServiceToken, MyOtherToken, MyExtensionPointToken } from '../tokens';
 *
 * export const module = declare<MyPluginStart>(({ provide, host, contribute }) => {
 *   provide(MyServiceToken, (start) => start.myService);
 *   provide(MyOtherToken, implementedBy(MyServiceImpl));
 *   host(MyExtensionPointToken);
 *   contribute(MyExtensionPointToken, myContribution);
 *   provide(MyScopedToken, using((bindTo) => bindTo.to(MyScoped).inRequestScope()));
 * });
 * ```
 *
 * @param callback - Receives {@link DeclareOptions} and registers bindings.
 *   The callback is invoked synchronously when the module is loaded into a
 *   container.
 * @public
 */
export const declare = <TStart = RequiresPluginStart>(
  callback: (options: DeclareOptions<TStart>) => void
): ContainerModule =>
  new ContainerModule((options) => {
    const provide = <T>(
      token: ServiceToken<T>,
      source: ((start: TStart) => T) | Fulfillment<T>
    ): void => {
      options.bind(ProvidedService).toConstantValue(token);

      if (isFulfillment<T>(source)) {
        source.configure(options.bind(token));
        return;
      }

      options
        .bind(token)
        .toResolvedValue(source, [Start as ServiceIdentifier<TStart>])
        .inSingletonScope();
    };

    const host = <T>(extensionPoint: ExtensionPointToken<T>): void => {
      options.bind(HostedExtensionPoint).toConstantValue(extensionPoint);
    };

    const contribute = <T>(
      extensionPoint: ExtensionPointToken<T>,
      source: T | Fulfillment<T>
    ): void => {
      options.bind(ContributedExtensionPoint).toConstantValue(extensionPoint);

      if (isFulfillment<T>(source)) {
        source.configure(options.bind(extensionPoint));
        return;
      }

      options.bind(extensionPoint).toConstantValue(source);
    };

    callback({ bind: options.bind, contribute, host, provide });
  });
