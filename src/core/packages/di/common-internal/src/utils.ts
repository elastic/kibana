/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule, type ServiceIdentifier } from 'inversify';

/** @internal */
export function toContainerModule<T extends object>(
  object: T,
  iteratee = toServiceIdentifier<T>()
): ContainerModule {
  return new ContainerModule(({ bind }) => {
    for (const [key, value] of Object.entries(object)) {
      bind(iteratee(key as keyof T)).toConstantValue(value);
    }
  });
}

/** @internal */
export function toServiceIdentifier<T>(
  ...prefix: string[]
): <K extends keyof T>(key: K) => ServiceIdentifier<T[K]> {
  return (...key) => Symbol.for([...prefix, key].join('.'));
}
