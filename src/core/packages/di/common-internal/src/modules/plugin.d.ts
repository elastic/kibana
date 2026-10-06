/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container } from 'inversify';
import {
  ContainerModule,
  type ContainerOptions,
  type ResolutionContext,
  type ServiceIdentifier,
} from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
type ScopeFactory = (id?: PluginOpaqueId) => Container;
/**
 * The service identifier for the global service references.
 */
export declare const Global: import('@kbn/core-di').ServiceToken<ServiceIdentifier>;
/**
 * Plugin scope factory.
 *
 * The factory creates a new container for the plugin dependencies.
 * Services registered in this scope are not visible outside unless they are explicitely exposed using the `Global` symbol.
 */
export declare const Plugin: import('@kbn/core-di').ServiceToken<ScopeFactory>;
/**
 * Isolated child context factory.
 *
 * This factory creates an intermediate or temporary child container to handle HTTP requests or other short-lived operations.
 */
export declare const Fork: import('@kbn/core-di').ServiceToken<ScopeFactory>;
export declare class PluginModule extends ContainerModule {
  private readonly options?;
  private services;
  private activated;
  private bound;
  constructor(root: Container, options?: Omit<ContainerOptions, 'parent'> | undefined);
  protected getDefaultContract(): undefined;
  protected onContractActivation<T>(
    hook: ServiceIdentifier<(container: Container) => void>,
    { get }: ResolutionContext,
    contract: T
  ): T;
  protected onGlobalActivation<T extends ServiceIdentifier>(
    { get }: ResolutionContext,
    service: T
  ): T;
  protected getForkFactory({ get }: ResolutionContext): ScopeFactory;
  protected getPluginFactory({ get }: ResolutionContext): ScopeFactory;
  protected registerGlobals(scope: Container): void;
  private inheritGlobals;
  private createChild;
  private getServicesCount;
  private incrementServicesCount;
}
export {};
