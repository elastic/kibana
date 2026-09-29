/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';

/**
 * A DI token that carries its resolved value type, allowing consumers to infer
 * the service type via {@link ServiceTypeOf} without a separate import.
 *
 * @example
 * ```ts
 * export const MyServiceToken = createToken<IMyService>('myPlugin.MyService');
 * ```
 * @public
 */
export type ServiceToken<T = unknown> = ServiceIdentifier<T> & { _type?: T };

/**
 * Infers the service type carried by a {@link ServiceToken}.
 *
 * @example
 * ```ts
 * import { MyServiceToken } from 'plugin';
 *
 * class A {
 *   constructor(
 *     @inject(MyServiceToken) private myService: ServiceTypeOf<typeof MyServiceToken>
 *   ) {}
 * }
 * ```
 * @public
 */
export type ServiceTypeOf<Token> = Token extends ServiceToken<infer T> ? T : never;

/**
 * Creates an injection token backed by the global symbol registry (`Symbol.for`).
 * The token carries the service type `T` so that consumers can use {@link ServiceTypeOf}
 * to infer it without importing the type directly.
 *
 * @param id A unique, namespaced identifier (e.g. `'myPlugin.MyService'`).
 * @public
 */
export function createToken<T = unknown>(id: string): ServiceToken<T> {
  return Symbol.for(id) as ServiceToken<T>;
}
