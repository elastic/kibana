/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { PluginServiceFactory } from './factory';

/**
 * A collection of `PluginServiceProvider` objects, keyed by the `Services` API generic.
 *
 * The `Services` generic determines the shape of all service APIs being produced.
 * The `StartParameters` generic determines what parameters are expected to
 * start the service.
 */
export type PluginServiceProviders<Services, StartParameters = {}> = {
  [K in keyof Services]: PluginServiceProvider<Services[K], StartParameters>;
};

/**
 * An object which uses a given factory to start, stop or provide a service.
 *
 * The `Service` generic determines the shape of the API being produced.
 * The `StartParameters` generic determines what parameters are expected to
 * start the service.
 */
export class PluginServiceProvider<Service extends {}, StartParameters = {}> {
  private factory: PluginServiceFactory<Service, StartParameters>;
  private context = createContext<Service | null>(null);
  private pluginService: Service | null = null;
  public readonly Provider: React.FC = ({ children }) => {
    return <this.context.Provider value={this.getService()}>{children}</this.context.Provider>;
  };

  constructor(factory: PluginServiceFactory<Service, StartParameters>) {
    this.factory = factory;
    this.context.displayName = 'PluginServiceContext';
  }

  /**
   * Private getter that will enforce proper setup throughout the class.
   */
  private getService() {
    if (!this.pluginService) {
      throw new Error('Service not started');
    }
    return this.pluginService;
  }

  /**
   * Start the service.
   *
   * @param params Parameters used to start the service.
   */
  start(params: StartParameters) {
    this.pluginService = this.factory(params);
  }

  /**
   * Returns a function for providing a Context hook for the service.
   */
  getUseServiceHook() {
    return () => {
      const service = useContext(this.context);

      if (!service) {
        throw new Error('Provider is not set up correctly');
      }

      return service;
    };
  }

  /**
   * Stop the service.
   */
  stop() {
    this.pluginService = null;
  }
}
