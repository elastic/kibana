/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule, type interfaces } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import { Global } from '@kbn/core-di-common';

export const Context = Symbol('Context') as interfaces.ServiceIdentifier<interfaces.Container>;
export const Id = Symbol('Id') as interfaces.ServiceIdentifier<PluginOpaqueId>;
export const Plugin = Symbol('Plugin') as interfaces.ServiceIdentifier<interfaces.Container>;
export const Scope = Symbol('Scope') as interfaces.ServiceIdentifier<interfaces.Container>;

export const pluginModule = new ContainerModule(
  (bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
    const scopes = new WeakMap<interfaces.Container, Set<PluginOpaqueId>>();

    bind(Plugin)
      .toDynamicValue(({ container, currentRequest: { target } }) => {
        const name = target.getNamedTag()?.value as PluginOpaqueId | undefined;

        if (!name) {
          throw new Error('Plugin instance must be named.');
        }

        if (!scopes.has(container)) {
          scopes.set(container, new Set());
        }

        const initialized = scopes.get(container)!;
        if (!initialized.has(name)) {
          const parent =
            container.parent?.getNamed(target.serviceIdentifier as typeof Plugin, name) ??
            container;
          const scope = parent.createChild();

          scope.bind(Context).toConstantValue(container);
          scope.bind(Id).toConstantValue(name);

          container
            .bind(Scope)
            .toConstantValue(scope)
            .whenTargetNamed(name)
            .onDeactivation(() => {
              initialized.delete(name);
              scope.unbindAll();
            });

          initialized.add(name);
        }

        return container.getNamed(Scope, name);
      })
      .inRequestScope();

    const scoped = new WeakMap<
      interfaces.Container,
      Map<interfaces.ServiceIdentifier<unknown>, number>
    >();
    const contextual = new WeakMap<
      interfaces.Container,
      Map<interfaces.ServiceIdentifier<unknown>, number>
    >();
    const bound = new WeakSet<interfaces.Container>();

    onActivation(Global, ({ container: scope }, service) => {
      const context = scope.get(Context);
      const name = scope.get(Id);

      if (!scoped.has(scope)) {
        scoped.set(scope, new Map());
      }

      const counter = scoped.get(scope)!;
      const index = counter.get(service) ?? 0;
      counter.set(service, index + 1);

      context
        .bind(service)
        .toDynamicValue(({ container: origin }) => {
          const context = origin.isBound(Context) ? origin.get(Context) : origin;
          const target = context.getNamed(Plugin, name);

          if (!bound.has(origin)) {
            bound.add(origin);
            if (origin.isCurrentBound(Global)) {
              origin.getAll(Global);
            }
          }

          if (!bound.has(target) && contextual.has(context)) {
            bound.add(target);
            for (const [service, count] of contextual.get(context)!) {
              for (let index = 0; index < count; index++) {
                target
                  .bind(service)
                  .toDynamicValue(({ container }) => {
                    const context = container.get(Context);

                    return count > 1 ? context.getAll(service)[index] : context.get(service);
                  })
                  .inRequestScope();
              }
            }
          }

          return counter.get(service)! > 1 ? target.getAll(service)[index] : target.get(service);
        })
        .inRequestScope();

      if (scope.parent !== context) {
        if (!contextual.has(context)) {
          contextual.set(context, new Map());
        }

        const counter = contextual.get(context)!;
        counter.set(service, (counter.get(service) ?? 0) + 1);
      }

      return service;
    });
});
