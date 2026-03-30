/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  inject,
  multiInject,
  type Container,
  type GetOptions,
  type OptionalGetOptions,
  type ServiceIdentifier,
} from 'inversify';
import type { ExtensionPointToken, ServiceToken } from './create_token';
import { HostedExtensionPoint } from './plugin_markers';

/**
 * Resolves a service from a container.
 *
 * Cross-plugin callers should pass a `ServiceToken`. Local/private DI may also
 * pass any other Inversify `ServiceIdentifier`.
 * @public
 */
export function getService<T>(
  container: Container,
  service: ServiceIdentifier<T>,
  options?: GetOptions
): T;

/**
 * Resolves an optional service token from a container.
 * @public
 */
export function getService<T>(
  container: Container,
  service: ServiceIdentifier<T>,
  options: OptionalGetOptions
): T | undefined;

/** @internal */
export function getService<T>(
  container: Container,
  service: ServiceIdentifier<T>,
  options?: GetOptions | OptionalGetOptions
): T | undefined {
  return container.get<T>(service, options as GetOptions);
}

/**
 * Resolves all contributions for an extension point from a container.
 * Returns an empty array when there are no contributions.
 * @public
 */
export const getExtensions = <T>(
  container: Container,
  extensionPoint: ExtensionPointToken<T>
): T[] => {
  try {
    return container.getAll<T>(extensionPoint);
  } catch (err) {
    if (isHostedExtensionPoint(container, extensionPoint)) {
      return [];
    }

    throw err;
  }
};

/**
 * Decorator that injects a single cross-plugin service.
 * @public
 */
export const injectService = <T>(service: ServiceToken<T>) => inject(service);

/**
 * Decorator that injects all contributions for an extension point.
 * @public
 */
export const injectExtensions = <T>(extensionPoint: ExtensionPointToken<T>) =>
  multiInject(extensionPoint);

const isHostedExtensionPoint = <T>(
  container: Container,
  extensionPoint: ExtensionPointToken<T>
): boolean => {
  try {
    return container.getAll(HostedExtensionPoint, { chained: true }).includes(extensionPoint);
  } catch {
    return false;
  }
};
