/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken, type ServiceToken } from './token';

declare const extensionPointBrand: unique symbol;

/**
 * A token other plugins contribute values of type `T` to, without a plugin dependency on its owner.
 * Contributions are registered with `extensions.contribute` and read through `ExtensionService` or `extensions.collect`, never bound under the token itself.
 * @public
 */
export type ExtensionPoint<T> = ServiceToken<T> & symbol & { readonly [extensionPointBrand]: true };

/**
 * Options of an extension point.
 * Reserved for future options, such as the lifecycle phase its contributions are available in.
 * @public
 */
export type ExtensionPointOptions = Record<string, never>;

/**
 * Creates an extension point token.
 * Two extension points with the same id are the same point, so ids must be unique across Kibana.
 * @example
 * ```ts
 * export const Widget = createExtensionPoint<Widget>('myPlugin.Widget');
 * ```
 * @param id The unique extension point id.
 * @param options The extension point options.
 * @public
 */
export const createExtensionPoint = <T>(
  id: string,
  options?: ExtensionPointOptions
): ExtensionPoint<T> => createToken<T>(id) as ExtensionPoint<T>;
