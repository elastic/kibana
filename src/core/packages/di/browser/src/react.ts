/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container, GetOptions, OptionalGetOptions, ServiceIdentifier } from 'inversify';
import { createContext, useContext, useMemo } from 'react';

/**
 * The React context to provide the dependency injection container.
 * @public
 */
export const Context = createContext<Container | undefined>(undefined);

Context.displayName = 'KbnDiContainerContext';

/**
 * The `useContainer` hook is used to retrieve the dependency injection container from the context.
 * @see {@link Container}
 * @public
 */
export const useContainer = () => useContext(Context);

/**
 * The `useService` hook is used to retrieve a service from the dependency injection container.
 * The service is resolved asynchronously, which is required for asynchronous bindings.
 * @see {@link Container.getAsync}
 * @param service The service identifier to resolve.
 * @param options InverisfyJS options to pass to the `getAsync` method.
 * @public
 */
export function useService<T>(
  service: ServiceIdentifier<T>,
  options: OptionalGetOptions & { async: true }
): Promise<T | undefined>;

/**
 * The `useService` hook is used to retrieve a service from the dependency injection container.
 * The service is resolved asynchronously, which is required for asynchronous bindings.
 * @see {@link Container.getAsync}
 * @param service The service identifier to resolve.
 * @param options InverisfyJS options to pass to the `getAsync` method.
 * @public
 */
export function useService<T>(
  service: ServiceIdentifier<T>,
  options: GetOptions & { async: true }
): Promise<T>;

/**
 * The `useService` hook is used to retrieve a service from the dependency injection container.
 * @see {@link Container.get}
 * @param service The service identifier to resolve.
 * @param options InverisfyJS options to pass to the `get` method.
 * @public
 */
export function useService<T>(
  service: ServiceIdentifier<T>,
  options: OptionalGetOptions
): T | undefined;

/**
 * The `useService` hook is used to retrieve a service from the dependency injection container.
 * @see {@link Container.get}
 * @param service The service identifier to resolve.
 * @param options InverisfyJS options to pass to the `get` method.
 * @public
 */
export function useService<T>(service: ServiceIdentifier<T>, options?: GetOptions): T;

/** @internal */
export function useService<T>(
  service: ServiceIdentifier<T>,
  options?: GetOptions & { async?: boolean }
): T | undefined | Promise<T | undefined> {
  const container = useContainer();
  if (!container) {
    throw new Error('The dependency injection container is not provided in the context.');
  }

  return useMemo(
    () =>
      options?.async
        ? (container.getAsync(service, options) as T)
        : (container.get(service, options) as T),
    [container, service, options]
  );
}
