/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule, type interfaces } from 'inversify';
import { OnSetup, OnStart, Setup, Start } from '@kbn/core-di-common';

export const Contract = Symbol.for('Contract') as interfaces.ServiceIdentifier<unknown>;

export class LifecycleModule extends ContainerModule {
  private readonly activated = new WeakSet<interfaces.Container>();
  private readonly cache = new WeakMap<
    interfaces.Container,
    Map<interfaces.ServiceIdentifier, unknown>
  >();

  constructor() {
    super((bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
      onActivation(Setup, this.activateService);
      onActivation(Start, this.activateService);
      bind(Contract)
        .toDynamicValue(this.getContract(Setup))
        .inRequestScope()
        .onActivation(this.activateContract(OnSetup))
        .whenTargetNamed(Setup as symbol);
      bind(Contract)
        .toDynamicValue(this.getContract(Start))
        .inRequestScope()
        .onActivation(this.activateContract(OnStart))
        .whenTargetNamed(Start as symbol);
    });
  }

  protected activateContract(
    hook: interfaces.ServiceIdentifier<(container: interfaces.Container) => void>
  ): interfaces.BindingActivation<unknown> {
    return ({ container }, contract) => {
      if (this.activated.has(container)) {
        return contract;
      }

      for (let current: typeof container.parent = container; current; current = current.parent) {
        if (current.isCurrentBound(hook)) {
          current.getAll(hook).forEach((callback) => callback(container));
        }
      }

      this.activated.add(container);

      return contract;
    };
  }

  protected activateService: interfaces.BindingActivation<unknown> = (
    { container, currentRequest: { target } },
    service
  ) => {
    const name = target.getNamedTag()?.value;
    const contract = target.serviceIdentifier;

    if (!this.cache.has(container)) {
      this.cache.set(container, new Map());
    }

    const contracts = this.cache.get(container)!;

    contracts.set(
      contract,
      name
        ? {
            ...(contracts.get(contract) ?? {}),
            [name]: service,
          }
        : service
    );

    return service;
  };

  protected getContract(service: interfaces.ServiceIdentifier): interfaces.DynamicValue<unknown> {
    return ({ container }) => {
      if (container.isCurrentBound(service)) {
        container.getAll(service);
      }

      return this.cache.get(container)?.get(service);
    };
  }
}
