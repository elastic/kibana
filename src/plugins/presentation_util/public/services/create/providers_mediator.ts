/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DependencyManager } from './dependency_manager';
import { PluginServiceProviders, PluginServiceRequiredServices } from './provider';

export class PluginServiceProvidersMediator<Services, StartParameters> {
  constructor(private readonly providers: PluginServiceProviders<Services, StartParameters>) {}

  start(params: StartParameters) {
    this.getOrderedDependencies().forEach((service) => {
      this.providers[service].start(params, this.getServiceDependencies(service));
    });
  }

  stop() {
    this.getOrderedDependencies().forEach((service) => this.providers[service].stop());
  }

  private getOrderedDependencies() {
    const dependenciesGraph = this.getGraphOfDependencies();
    return DependencyManager.orderDependencies<keyof Services>(dependenciesGraph);
  }

  private getGraphOfDependencies() {
    return this.getProvidersNames().reduce<Record<keyof Services, Array<keyof Services>>>(
      (graph, vertex) => ({ ...graph, [vertex]: this.providers[vertex].requiredServices ?? [] }),
      {} as Record<keyof Services, Array<keyof Services>>
    );
  }

  private getProvidersNames() {
    return Object.keys(this.providers) as Array<keyof Services>;
  }

  private getServiceDependencies(service: keyof Services) {
    const requiredServices = this.providers[service].requiredServices ?? [];
    return this.getServicesByDeps(requiredServices);
  }

  private getServicesByDeps(deps: Array<keyof Services>) {
    return deps.reduce<PluginServiceRequiredServices<Array<keyof Services>, Services>>(
      (services, dependency) => ({
        ...services,
        [dependency]: this.providers[dependency].getService(),
      }),
      {} as PluginServiceRequiredServices<Array<keyof Services>, Services>
    );
  }
}
