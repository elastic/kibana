/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
import { AutocompleteService } from './autocomplete';
import type { AutocompleteSetup } from './autocomplete/autocomplete_service';

export interface KQLServerPluginSetup {
  autocomplete: AutocompleteSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KQLServerPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KQLServerPluginSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KQLServerPluginStartDependencies {}

export class KQLServerPlugin
  implements
    Plugin<
      KQLServerPluginSetup,
      KQLServerPluginStart,
      KQLServerPluginSetupDependencies,
      KQLServerPluginStartDependencies
    >
{
  private readonly autocompleteService: AutocompleteService;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.autocompleteService = new AutocompleteService(initializerContext);
  }

  public setup(
    core: CoreSetup<KQLServerPluginStartDependencies, KQLServerPluginStart>,
    {}: KQLServerPluginSetupDependencies
  ) {
    return {
      autocomplete: this.autocompleteService.setup(core),
    };
  }

  public start(core: CoreStart, {}: KQLServerPluginStartDependencies) {
    return {};
  }

  public stop() {}
}

export { KQLServerPlugin as Plugin };
