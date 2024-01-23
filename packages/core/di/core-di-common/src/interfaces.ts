/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { interfaces } from 'inversify';

/**
 * A identifier that can be used to uniquely identify a service.
 */
export type ServiceIdentifier<T = unknown> = interfaces.ServiceIdentifier<T>;

/**
 * The public interface for an injection container during registration by plugins.
 */
export type PluginContainer = Omit<interfaces.Container, 'parent'>;

export type ContainerModule = interfaces.ContainerModule;

export interface CreateModuleOptions {
  bind: interfaces.Bind;
  unbind: interfaces.Unbind;
  isBound: interfaces.IsBound;
  rebind: interfaces.Rebind;
  unbindAsync: interfaces.UnbindAsync;
  onActivation: interfaces.Container['onActivation'];
  onDeactivation: interfaces.Container['onDeactivation'];
}

export type CreateModuleFn = (callback: CreateModuleCallback) => ContainerModule;

export type CreateModuleCallback = (options: CreateModuleOptions) => void;

/**
 * A readonly container, as exposed to plugin though the start contract of Core's injection service
 */
export interface ReadonlyContainer {
  get<T>(serviceIdentifier: ServiceIdentifier<T>): T;
}
