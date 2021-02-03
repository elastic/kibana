/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TypeOf } from '@kbn/config-schema';
import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { registerRoutes } from './routes';
import { ConfigSchema, configSchema } from '../../config';

export class AutocompleteService implements Plugin<void> {
  private valueSuggestionsEnabled: boolean = true;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {
    initializerContext.config.create<TypeOf<typeof configSchema>>().subscribe((configUpdate) => {
      this.valueSuggestionsEnabled = configUpdate.autocomplete.valueSuggestions.enabled;
    });
  }

  public setup(core: CoreSetup) {
    if (this.valueSuggestionsEnabled)
      registerRoutes(core, this.initializerContext.config.legacy.globalConfig$);
  }

  public start() {}
}
