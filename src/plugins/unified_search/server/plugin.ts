/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { ConfigSchema } from '../config';
import { AutocompleteService } from './autocomplete';
import { AutocompleteSetup } from './autocomplete/autocomplete_service';

export interface UnifiedSearchServerPluginSetup {
  autocomplete: AutocompleteSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedSearchServerPluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedSearchServerPluginSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedSearchServerPluginStartDependencies {}

export class UnifiedSearchServerPlugin implements Plugin<UnifiedSearchServerPluginSetup> {
  private readonly autocompleteService: AutocompleteService;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.autocompleteService = new AutocompleteService(initializerContext);
  }

  public setup(
    core: CoreSetup<UnifiedSearchServerPluginStartDependencies, UnifiedSearchServerPluginStart>,
    {}: UnifiedSearchServerPluginSetupDependencies
  ) {
    return {
      autocomplete: this.autocompleteService.setup(core),
    };
  }

  public start(core: CoreStart, {}: UnifiedSearchServerPluginStartDependencies) {
    return {};
  }

  public stop() {}
}

export { UnifiedSearchServerPlugin as Plugin };
