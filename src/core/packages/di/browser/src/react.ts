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

export const Context = createContext<Container | undefined>(undefined);

Context.displayName = 'KbnDiContainerContext';

export const useContainer = () => useContext(Context);

/**
 * The `useService` hook is used to retrieve a service from the dependency injection container.
 * @see {@link Container.get}
 * @param service The service identifier to resolve.
 * @param options InverisfyJS options to pass to the `get` method.
 */
export function useService<T>(
  service: ServiceIdentifier<T>,
  options: OptionalGetOptions
): T | undefined;
export function useService<T>(service: ServiceIdentifier<T>, options?: GetOptions): T;
export function useService<T>(...params: Parameters<Container['get']>): T {
  const container = useContainer();
  if (!container) {
    throw new Error('The dependency injection container is not provided in the context.');
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => container.get<T>(...params), [container, ...params]);
}
