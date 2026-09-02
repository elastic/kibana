/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type Container,
  type ContainerModuleLoadOptions,
  type GetOptions,
  type GetAllOptions,
  LazyServiceIdentifier,
  type MapToResolvedValueInjectOptions,
  type ResolutionContext,
  type ResolvedValueInjectOptions,
  type ServiceIdentifier,
} from 'inversify';
import { once, wrap } from 'lodash';
import {
  type KibanaContainerModuleLoadOptions,
  type KibanaResolutionContext,
  OnSetup,
  OnStart,
} from '@kbn/core-di';

declare module 'lodash' {
  interface LoDashStatic {
    wrap<A extends unknown[], R>(
      value: (...args: A) => R,
      wrapper: (value: (...args: NoInfer<A>) => NoInfer<R>, ...args: NoInfer<A>) => NoInfer<R>
    ): (...args: A) => R;
  }
}

interface NormalizedResolutionOptions<T> extends GetOptions, GetAllOptions {
  serviceIdentifier: ServiceIdentifier<T>;
  isMultiple?: boolean;
}

function normalizeResolutionOptions<T>(
  request: ResolvedValueInjectOptions<T>
): NormalizedResolutionOptions<T> {
  if (typeof request !== 'object') {
    return { serviceIdentifier: request };
  }

  if (LazyServiceIdentifier.is(request)) {
    return { serviceIdentifier: request.unwrap() };
  }

  return {
    ...request,
    serviceIdentifier: LazyServiceIdentifier.is<T>(request.serviceIdentifier)
      ? request.serviceIdentifier.unwrap()
      : (request.serviceIdentifier as ServiceIdentifier<T>),
  };
}

function resolveSync<A extends unknown[]>(
  context: Pick<ResolutionContext, 'get' | 'getAll'>,
  services: MapToResolvedValueInjectOptions<A>
): A {
  return services.map((service) => {
    const { serviceIdentifier, isMultiple, ...options } = normalizeResolutionOptions(service);

    return isMultiple
      ? context.getAll(serviceIdentifier, options)
      : context.get(serviceIdentifier, options);
  }) as A;
}

function resolveAsync<A extends unknown[]>(
  context: Pick<ResolutionContext, 'getAsync' | 'getAllAsync'>,
  services: MapToResolvedValueInjectOptions<A>
): Promise<A> {
  return Promise.all(
    services.map((service) => {
      const { serviceIdentifier, isMultiple, ...options } = normalizeResolutionOptions(service);

      return isMultiple
        ? context.getAllAsync(serviceIdentifier, options)
        : context.getAsync(serviceIdentifier, options);
    })
  ) as Promise<A>;
}

function pop<H extends unknown[], L>(tuple: [...head: H, last: L]): [H, L] {
  return [tuple.slice(0, -1) as H, tuple[tuple.length - 1] as L];
}

export function toKibanaContainerModuleLoadOptions(
  options: ContainerModuleLoadOptions
): KibanaContainerModuleLoadOptions {
  const started = new Promise((resolve) => {
    const id = options
      .bind(OnStart)
      .toConstantValue(
        once((container) => {
          resolve(container);
          options.unbind(id);
        })
      )
      .getIdentifier();
  });

  const inject = ((...definition) =>
    async (context, ...args) => {
      await started;
      const [dependencies, inner] = pop(definition);
      const resolvedDependencies = await resolveAsync(context, dependencies);

      return inner(...resolvedDependencies, ...args);
    }) as KibanaContainerModuleLoadOptions['inject'];

  const bind = ((serviceIdentifier) => {
    const fluentSyntax = options.bind(serviceIdentifier);

    return Object.defineProperties(fluentSyntax, {
      toDynamicValue: {
        value: wrap(fluentSyntax.toDynamicValue, (toDynamicValue, builder) =>
          toDynamicValue.call(
            fluentSyntax,
            wrap(builder, (inner, context) => inner(toKibanaResolutionContext(context)))
          )
        ),
      },
      toFactory: {
        value: wrap(fluentSyntax.toFactory, (toFactory, factory) =>
          toFactory.call(
            fluentSyntax,
            wrap(factory, (inner, context) =>
              inner(toKibanaResolutionContext(context))
            ) as Parameters<typeof toFactory>[0]
          )
        ),
      },
    });
  }) as KibanaContainerModuleLoadOptions['bind'];

  const onActivation = ((serviceIdentifier, activation) => {
    options.onActivation(serviceIdentifier, (context, injectable) =>
      activation(toKibanaResolutionContext(context), injectable)
    );
  }) as KibanaContainerModuleLoadOptions['onActivation'];

  function toKibanaResolutionContext(context: ResolutionContext): KibanaResolutionContext {
    return {
      ...context,
      inject: (...args) => inject(...args).bind(undefined, context),
    };
  }

  function createHook(
    hook: ServiceIdentifier<(container: Container) => void>
  ): KibanaContainerModuleLoadOptions['onSetup'] | KibanaContainerModuleLoadOptions['onStart'] {
    return (serviceIdentifier, ...definition) => {
      options.onActivation(serviceIdentifier, (context, injectable) => {
        const [dependencies, handler] = pop(definition);

        handler(
          ...([
            toKibanaResolutionContext(context),
            injectable,
            ...resolveSync(context, dependencies),
          ] as const)
        );

        return injectable;
      });
      options.bind(hook).toConstantValue((container) => {
        if (container.isCurrentBound(serviceIdentifier)) {
          container.getAll(serviceIdentifier);
        }
      });
    };
  }

  return {
    ...options,
    bind,
    inject,
    onActivation,
    onSetup: createHook(OnSetup),
    onStart: createHook(OnStart),
  };
}
