/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type BindToFluentSyntax,
  type Container,
  ContainerModule,
  type ContainerModuleLoadOptions,
  type ResolutionContext,
  type ServiceIdentifier,
} from 'inversify';
import { OnSetup, OnStart } from './services/plugin';

export type KibanaBind = <T>(
  serviceIdentifier: ServiceIdentifier<T>
) => KibanaBindToFluentSyntax<T>;
export type KibanaHandler<T> = (context: ResolutionContext, injectable: T) => void;

export interface KibanaBindToFluentSyntax<T> extends BindToFluentSyntax<T> {
  /**
   * Binds a handler that will be called after the setup phase against every bound service.
   * @param handler The handler to perform an action with the service instance.
   */
  onSetup(handler: KibanaHandler<T>): void;

  /**
   * Binds a handler that will be called after the start phase against every bound service.
   * @param handler The handler to perform an action with the service instance.
   */
  onStart(handler: KibanaHandler<T>): void;
}

/**
 * Extended container module options providing Kibana-specific features.
 */
export interface KibanaContainerModuleLoadOptions extends ContainerModuleLoadOptions {
  /**
   * An extended binding supporting Kibana-specific features.
   */
  bind: KibanaBind;
}

/**
 * An extended container module that supports Kibana-specific features.
 */
export class KibanaContainerModule extends ContainerModule {
  constructor(load: (options: KibanaContainerModuleLoadOptions) => void | Promise<void>) {
    super((options) =>
      load({
        ...options,
        bind: this.#bind.bind(this, options) as KibanaBind,
      })
    );
  }

  #bind<T>(
    options: ContainerModuleLoadOptions,
    serviceIdentifier: ServiceIdentifier<T>
  ): KibanaBindToFluentSyntax<T> {
    const fluentSyntax = options.bind(serviceIdentifier);

    Object.defineProperties(fluentSyntax, {
      onSetup: {
        value: this.#onHook.bind(this, OnSetup, options, serviceIdentifier),
      },
      onStart: {
        value: this.#onHook.bind(this, OnStart, options, serviceIdentifier),
      },
    });

    return fluentSyntax as KibanaBindToFluentSyntax<T>;
  }

  #onHook<T>(
    hook: ServiceIdentifier<(container: Container) => void>,
    { bind, onActivation }: ContainerModuleLoadOptions,
    serviceIdentifier: ServiceIdentifier<T>,
    handler: KibanaHandler<T>,
  ): void {
    onActivation(serviceIdentifier, (context, injectable) => {
      handler(context, injectable);

      return injectable;
    });
    bind(hook).toConstantValue((container) => {
      container.getAll(serviceIdentifier);
    });
  }
}
