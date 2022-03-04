/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { registerRoutes } from './routes';
import { ConfigSchema } from '../../config';

export class AutocompleteService implements Plugin<void> {
  private valueSuggestionsEnabled: boolean = true;
  private autocompleteSettings: ConfigSchema['autocomplete']['valueSuggestions'];

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {
    initializerContext.config.create().subscribe((configUpdate) => {
      this.valueSuggestionsEnabled = configUpdate.autocomplete.valueSuggestions.enabled;
      this.autocompleteSettings = configUpdate.autocomplete.valueSuggestions;
    });
    this.autocompleteSettings =
      this.initializerContext.config.get<ConfigSchema>().autocomplete.valueSuggestions;
  }

  public setup(core: CoreSetup) {
    if (this.valueSuggestionsEnabled) registerRoutes(core, this.initializerContext.config.create());
    const { terminateAfter, timeout } = this.autocompleteSettings;
    return {
      getAutocompleteSettings: () => ({
        terminateAfter: moment.duration(terminateAfter).asMilliseconds(),
        timeout: moment.duration(timeout).asMilliseconds(),
      }),
    };
  }

  public start() {}
}

/** @public **/
export type AutocompleteSetup = ReturnType<AutocompleteService['setup']>;
