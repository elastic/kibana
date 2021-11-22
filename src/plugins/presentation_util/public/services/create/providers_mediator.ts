/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceProviders } from './provider';

export class PluginServiceProvidersMediator<Services, StartParameters> {
  constructor(private readonly providers: PluginServiceProviders<Services, StartParameters>) {}

  start(params: StartParameters) {
    const providerNames = Object.keys(this.providers) as Array<keyof Services>;
    providerNames.forEach((providerName) => this.providers[providerName].start(params));
  }

  stop() {
    const providerNames = Object.keys(this.providers) as Array<keyof Services>;
    providerNames.forEach((providerName) => this.providers[providerName].stop());
  }

  private getOrderedProvidersByDeps() {}
  private getServicesByDeps(deps: Array<keyof Services>) {}
}
