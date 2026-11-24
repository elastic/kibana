/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare const contributionType: unique symbol;

/**
 * A point other plugins contribute values of type `T` to, without a plugin dependency on its owner.
 * It is not a service identifier, so it cannot be bound or injected directly.
 * @public
 */
export interface ExtensionPoint<T> {
  /** The unique id that contributions are grouped by. */
  readonly id: string;

  /** Carries the contribution type at compile time only. */
  readonly [contributionType]: T;
}

/**
 * Options of an extension point.
 * Reserved for future options, such as the lifecycle phase its contributions are available in.
 * @public
 */
export type ExtensionPointOptions = Record<string, never>;

/**
 * Creates an extension point.
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
): ExtensionPoint<T> => Object.freeze({ id }) as ExtensionPoint<T>;
