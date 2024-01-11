/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ServiceIdentifier,
  ServiceScope,
  InjectionParameter,
  isServiceIdParam,
  isServiceMarkerParam,
} from './service';

export interface InjectionContainer {
  get<T = unknown>(identifier: ServiceIdentifier<T>): T;

  register<T = unknown>(registration: ContainerServiceRegistrationOptions<T>): void;
}

interface ServiceRegistrationOptions {}

interface ServiceFactoryRegistration<T> {
  id: ServiceIdentifier<T>;
  scope: ServiceScope;
  // TODO: implement. If true, the service will be registered at the root container
  atRoot?: boolean;
  factory: (...args: any[]) => T;
  parameters: InjectionParameter[];
  // TODO: markers for
}

interface ServiceMetadata<T = unknown> {
  /**
   * The identifier of the service
   */
  id: ServiceIdentifier<T>;
  /**
   * The scope for this service
   */
  scope: ServiceScope;
  /**
   * The instance of the service. Will be undefined until instantiated.
   */
  instance: T | undefined;

  /**
   * The type of provider that was used to define this service
   * - factory: registered using a {@link ServiceFactoryRegistration}
   * - constructor: TODO
   * - instance: TODO
   */
  providerType: 'factory' | 'constructor' | 'instance';

  /**
   * The factory function
   * only present when providerType === 'factory'
   */
  factory: (...args: any[]) => T;
  /**
   * The factory parameter types
   * only present when providerType === 'factory'
   */
  factoryParameters: InjectionParameter[];
}

type ContainerServiceRegistrationOptions<T = unknown> = ServiceFactoryRegistration<T>;

export interface InjectionContainerConstructorOptions {
  containerId: string;
}

export class InjectionContainerImpl implements InjectionContainer {
  public readonly containerId;

  private readonly serviceMetadataMap = new Map<ServiceIdentifier, ServiceMetadata<unknown>>();

  constructor({ containerId }: InjectionContainerConstructorOptions) {
    this.containerId = containerId;
  }

  get<T = unknown>(identifier: ServiceIdentifier<T>): T {
    return this._resolveService(identifier, []);
  }

  register<T = unknown>(registration: ContainerServiceRegistrationOptions<T>): void {
    // TODO: check if service present

    if (isFactoryRegistration(registration)) {
      this.serviceMetadataMap.set(registration.id, {
        id: registration.id,
        scope: registration.scope, // TODO: if scope global we will want to register on the top container instead
        providerType: 'factory',
        factory: registration.factory,
        factoryParameters: registration.parameters,
        instance: undefined,
      });
    } else {
      // TODO later
      throw new Error('unsupported for now');
    }
  }

  _resolveService<T>(identifier: ServiceIdentifier<T>, identifierChain: ServiceIdentifier[]): T {
    // TODO: check cyclic dependency of identifiers

    // TODO: we will want to check on the parents too
    const metadata = this.serviceMetadataMap.get(identifier);

    if (!metadata) {
      throw new Error(
        `Service ${identifier} not found in container chain starting at id ${this.containerId}`
      );
    }

    if (metadata.instance) {
      return metadata.instance as T;
    }

    let instance: T;
    if (metadata.providerType === 'factory') {
      const parameters: unknown[] = [];
      for (const parameter of metadata.factoryParameters!) {
        if (isServiceIdParam(parameter)) {
          parameters.push(
            this._resolveService(parameter.serviceId, [...identifierChain, identifier])
          );
        } else if (isServiceMarkerParam(parameter)) {
          // TODO: inject all
        } else {
          throw new Error(`unsupported injection parameter type: ${parameter}`);
        }
      }
      try {
        instance = metadata.factory!(...parameters) as T;
      } catch (e) {
        throw new Error(`Error calling factory for service ${identifier}: ${e.message}`);
      }
    } else {
      // TODO later
      throw new Error('unsupported for now');
    }

    metadata.instance = instance;

    return instance;
  }
}

function isFactoryRegistration<T>(
  registration: ContainerServiceRegistrationOptions<T>
): registration is ServiceFactoryRegistration<T> {
  return 'factory' in registration && 'parameters' in registration;
}
