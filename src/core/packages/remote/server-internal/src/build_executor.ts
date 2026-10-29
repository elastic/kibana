/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'node:module';
import { Container } from 'inversify';
import type { RemoteWorkerSpec } from '@kbn/core-remote-common';

const loadModule = createRequire(__filename);

interface StepInstance {
  run(scopeId: string, input: unknown, context: unknown): Promise<unknown>;
}

// Matches Inversify's constructor service identifier, which accepts arbitrary constructor arguments.
type Constructor<T> = new (...args: any[]) => T;

export function loadExport(modulePath: string, exportName: string, loaded: string[]): unknown {
  loaded.push(modulePath);
  // Implementation modules are loaded from paths declared by trusted plugin remote indexes.
  const loadedModule = loadModule(modulePath) as Record<string, unknown>;
  const value = loadedModule[exportName];
  if (!value) {
    throw new Error(`Remote module ${modulePath} does not export ${exportName}`);
  }
  return value;
}

/**
 * Cap'n Web stubs are thenables. Inversify treats a thenable dependency as an async service and
 * refuses synchronous construction. Hide the promise methods so the stub injects as a capability
 * while its operations remain asynchronous.
 */
function injectableCapability(value: unknown): unknown {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }
  const thenable = value as { then?: unknown };
  if (typeof thenable.then !== 'function') {
    return value;
  }
  return new Proxy(value, {
    get(target, property) {
      if (property === 'then' || property === 'catch' || property === 'finally') {
        return undefined;
      }
      const member = (target as Record<PropertyKey, unknown>)[property];
      if (typeof member !== 'function') {
        return member;
      }
      // Do not touch `.bind` / `.apply` on the stub: Cap'n Web treats those as property paths.
      const call = member as (...args: unknown[]) => unknown;
      return (...args: unknown[]) => Reflect.apply(call, target, args);
    },
  });
}

/** Builds the executor-side container. Coordinator values are already bound instances or stubs. */
export function buildExecutor(
  spec: RemoteWorkerSpec,
  coordinator: ReadonlyMap<string, unknown>,
  loaded: string[]
): object {
  const container = new Container();
  for (const id of spec.coordinatorTokenIds) {
    const value = coordinator.get(id);
    if (value === undefined) {
      throw new Error(`Missing coordinator capability "${id}"`);
    }
    container.bind(Symbol.for(id)).toConstantValue(injectableCapability(value));
  }

  for (const provider of spec.executorProviders) {
    const Ctor = loadExport(
      provider.modulePath,
      provider.exportName,
      loaded
    ) as Constructor<object>;
    container.bind(Symbol.for(provider.tokenId)).to(Ctor).inSingletonScope();
  }

  const factories = new Map<string, () => StepInstance>();
  for (const contribution of spec.contributions) {
    const Ctor = loadExport(
      contribution.modulePath,
      contribution.exportName,
      loaded
    ) as Constructor<StepInstance>;
    container.bind(Ctor).toSelf().inTransientScope();
    factories.set(contribution.stepType, () => {
      const instance = container.get(Ctor);
      if (!instance) {
        throw new Error(`Unable to construct remote step "${contribution.stepType}"`);
      }
      return instance;
    });
  }

  if (spec.catalog) {
    const Catalog = loadExport(
      spec.catalog.modulePath,
      spec.catalog.exportName,
      loaded
    ) as Constructor<object>;
    container
      .bind(Symbol.for(spec.catalog.tokenId))
      .toConstantValue(new Catalog(factories as never));
  }

  const Root = loadExport(
    spec.root.modulePath,
    spec.root.exportName,
    loaded
  ) as Constructor<object>;
  const rootToken = Symbol.for(spec.root.tokenId);
  container.bind(rootToken).to(Root).inSingletonScope();
  return container.get(rootToken);
}
