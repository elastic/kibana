/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isServiceIdParam, isServiceLabelParam } from './service';
import type {
  InjectionContainer,
  CreateChildOptions,
  ServiceIdentifier,
  ServiceLabel,
  ServiceRegistration,
  InjectionParameter,
  ServiceMetadata,
} from './types';
import { getContainerRoot, convertRegistration } from './helpers';

export interface InjectionContainerConstructorOptions<Ctx = unknown> {
  containerId: string;
  context: Ctx;
  parent?: InjectionContainerImpl;
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
  protected readonly serviceByLabelMap: Map<ServiceLabel, ServiceIdentifier[]> = new Map();
  protected readonly serviceMap = new Map();

  constructor({ containerId, parent, context }: InjectionContainerConstructorOptions<Ctx>) {
    this.containerId = containerId;
    this.parent = parent;
    this.context = context;
    this.root = getContainerRoot(this);
    this._registerBuiltInService();
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

    const serviceMeta = convertRegistration(registration);
    registry.set(serviceMeta.id, serviceMeta);

    if (registration.labels) {
      registration.labels.forEach((label) => {
        if (this.serviceByLabelMap.has(label)) {
          this.serviceByLabelMap.get(label)!.push(registration.id);
        } else {
          this.serviceByLabelMap.set(label, [registration.id]);
        }
      });
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
      } else if (isServiceLabelParam(parameter)) {
        const ids = owningContainer._resolveIdsForLabel(parameter.serviceLabel);
        const services: unknown[] = [];
        ids.forEach((serviceId) => {
          const resolvedService = owningContainer._resolveService(serviceId, [
            ...identifierChain,
            identifier,
          ]);
          services.push(resolvedService);
        });
        return services;
      } else {
        throw new Error(`unsupported injection parameter type: ${parameter}`);
      }
    };

    const parameters: unknown[] = [];
    for (const parameter of metadata.factory.params) {
      parameters.push(resolveParameter(parameter));
    }
    try {
      instance = metadata.factory.fn(...parameters) as T;
    } catch (e) {
      throw new Error(`Error calling factory for service ${String(identifier)}: ${e.message}`);
    }

    owningContainer.serviceMap.set(identifier, instance);

    return instance;
  }

  private _resolveIdsForLabel(label: ServiceLabel): ServiceIdentifier[] {
    const identifiers: Set<ServiceIdentifier> = new Set();

    let container: InjectionContainerImpl | undefined = this;
    while (container) {
      const ids = container.serviceByLabelMap.get(label) ?? [];
      ids.forEach((id) => {
        identifiers.add(id);
      });
      container = container.parent;
    }
    return [...identifiers];
  }

  private _registerBuiltInService() {
    // register the container's context
    this.serviceMap.set(CONTEXT_SERVICE_KEY, this.context);
    this.serviceMetadata.set(CONTEXT_SERVICE_KEY, {
      id: CONTEXT_SERVICE_KEY,
      scope: 'container',
      providerType: 'instance',
      factory: {
        fn: () => this.context,
        params: [],
      },
      labels: [],
    });
  }
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
