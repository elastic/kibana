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
import type { ServiceFactory } from './types/service_factory';
import type { ServiceConstructor } from './types/service_contructor';
import type { ServiceRegistration } from './types/service_registration';
import { isConstructorRegistration, isFactoryRegistration } from './helpers';

export interface InjectionContainer<Ctx = unknown> {
  getId(): string;

  isRoot(): boolean;

  getParent(): InjectionContainer | undefined;

  getContext(): Ctx;

  getServiceMetadata(): ServiceMetadataRegistry;

  createChild<ChildCtx = unknown>(
    options: CreateChildOptions<ChildCtx>
  ): InjectionContainer<ChildCtx>;

  get<T = unknown>(identifier: ServiceIdentifier<T>): T;

  register<T = unknown>(registration: ServiceRegistration<T>): void;
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
   * The type of provider that was used to define this service
   * - factory: registered using a {@link ServiceFactoryRegistration}
   * - constructor: registered using a {@link ServiceConstructorRegistration}
   * - instance: TODO
   */
  providerType: 'factory' | 'constructor' | 'instance';

  /**
   * The factory definition
   * only present when providerType === 'factory'
   */
  factory?: ServiceFactory<T>;
  /**
   * The constructor definition
   * only present when providerType === 'factory'
   */
  service?: ServiceConstructor<T>;
}

export interface InjectionContainerConstructorOptions<Ctx = unknown> {
  containerId: string;
  context: Ctx;
  parent?: InjectionContainerImpl;
}

export interface CreateChildOptions<Ctx = unknown> {
  id: string;
  context: Ctx;
}

type ServiceMetadataRegistry = Map<ServiceIdentifier, ServiceMetadata<unknown>>;

export const CONTEXT_SERVICE_KEY = Symbol('InjectionContainerContext');

export class InjectionContainerImpl<Ctx = unknown> implements InjectionContainer<Ctx> {
  protected readonly containerId: string;
  protected readonly context: Ctx;

  protected readonly root: InjectionContainerImpl;
  protected readonly parent: InjectionContainerImpl | undefined;
  protected readonly childMap: Map<string, InjectionContainerImpl> = new Map();

  protected readonly serviceMetadata: ServiceMetadataRegistry = new Map();
  protected readonly serviceMap = new Map();

  constructor({ containerId, parent, context }: InjectionContainerConstructorOptions<Ctx>) {
    this.containerId = containerId;
    this.parent = parent;
    this.context = context;
    this.root = getRoot(this);
    this.serviceMap.set(CONTEXT_SERVICE_KEY, this.context);
    this.serviceMetadata.set(CONTEXT_SERVICE_KEY, {
      id: CONTEXT_SERVICE_KEY,
      scope: 'container',
      providerType: 'factory', // TODO: need to change to instance
    });
  }

  getId() {
    return this.containerId;
  }

  isRoot() {
    return this.parent === undefined;
  }

  getParent() {
    return this.parent;
  }

  getContext() {
    return this.context;
  }

  getServiceMetadata() {
    return this.serviceMetadata;
  }

  get<T = unknown>(identifier: ServiceIdentifier<T>): T {
    return this._resolveService(identifier, []);
  }

  createChild<ChildCtx = unknown>({
    id: childId,
    context: childContext,
  }: CreateChildOptions<ChildCtx>): InjectionContainer<ChildCtx> {
    if (this.childMap.has(childId)) {
      throw new Error(`Child container of ${this.containerId} already exists for id ${childId}`);
    }

    const child = new InjectionContainerImpl({
      parent: this,
      context: childContext,
      containerId: childId,
    });
    this.childMap.set(childId, child);

    return child;
  }

  register<T = unknown>(registration: ServiceRegistration<T>): void {
    // TODO: check if service present

    // TODO: check scope / registerAt to find the correct owner
    const registry = this.root.getServiceMetadata();

    if (isFactoryRegistration(registration)) {
      registry.set(registration.id, {
        id: registration.id,
        scope: registration.scope,
        providerType: 'factory',
        factory: registration.factory,
      });
    } else if (isConstructorRegistration(registration)) {
      // TODO: should probably convert everything to factory given it's easy and would simplify impl
      registry.set(registration.id, {
        id: registration.id,
        scope: registration.scope,
        providerType: 'constructor',
        service: registration.service,
      });
    } else {
      // TODO later
      throw new Error('unsupported for now');
    }
  }

  protected _resolveService<T>(
    identifier: ServiceIdentifier<T>,
    identifierChain: ServiceIdentifier[]
  ): T {
    const cycle = getCycle(identifier, identifierChain);
    if (cycle) {
      throw new Error(`Cyclic dependency detected: ${cycle.join('->')}`);
    }

    const registry = this.root.getServiceMetadata();
    // TODO: we will want to check on the parents too
    const metadata = registry.get(identifier);

    if (!metadata) {
      throw new Error(
        `Service ${String(identifier)} not found in container chain starting at id ${
          this.containerId
        }`
      );
    }

    const scope = metadata.scope;
    const owningContainer = scope === 'global' ? this.root : this;

    let instance: T = owningContainer.serviceMap.get(identifier);
    if (instance) {
      return instance;
    }

    const resolveParameter = (parameter: InjectionParameter): unknown => {
      if (isServiceIdParam(parameter)) {
        return owningContainer._resolveService(parameter.serviceId, [
          ...identifierChain,
          identifier,
        ]);
      } else if (isServiceMarkerParam(parameter)) {
        // TODO: inject all
      } else {
        throw new Error(`unsupported injection parameter type: ${parameter}`);
      }
    };

    if (metadata.providerType === 'factory') {
      const parameters: unknown[] = [];
      for (const parameter of metadata.factory!.params) {
        parameters.push(resolveParameter(parameter));
      }
      try {
        instance = metadata.factory!.fn(...parameters) as T;
      } catch (e) {
        throw new Error(`Error calling factory for service ${String(identifier)}: ${e.message}`);
      }
    } else if (metadata.providerType === 'constructor') {
      const parameters: unknown[] = [];
      for (const parameter of metadata.service!.params) {
        parameters.push(resolveParameter(parameter));
      }
      try {
        instance = new metadata.service!.type(...parameters) as T;
      } catch (e) {
        throw new Error(`Error calling factory for service ${String(identifier)}: ${e.message}`);
      }
    } else {
      // TODO later
      throw new Error('unsupported for now');
    }

    owningContainer.serviceMap.set(identifier, instance);

    return instance;
  }
}

function getRoot(container: InjectionContainerImpl) {
  let current = container;
  while (!current.isRoot()) {
    current = current.getParent()!;
  }
  return current;
}

function getCycle(
  next: ServiceIdentifier,
  chain: ServiceIdentifier[]
): ServiceIdentifier[] | undefined {
  const lastIndex = chain.lastIndexOf(next);
  if (lastIndex > -1) {
    return [...chain.slice(lastIndex), next];
  }
  return undefined;
}
