/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, PluginInitializerContext } from 'src/core/public';
import { TimefilterSetup } from '../query';
import { QuerySuggestionGetFn } from './providers/query_suggestion_provider';
import {
  getEmptyValueSuggestions,
  setupValueSuggestionProvider,
  ValueSuggestionsGetFn,
} from './providers/value_suggestion_provider';

import { ConfigSchema } from '../../config';

export class AutocompleteService {
  autocompleteConfig: ConfigSchema['autocomplete'];

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    const { autocomplete } = initializerContext.config.get<ConfigSchema>();

    this.autocompleteConfig = autocomplete;
  }

  private readonly querySuggestionProviders: Map<string, QuerySuggestionGetFn> = new Map();
  private getValueSuggestions?: ValueSuggestionsGetFn;

  private addQuerySuggestionProvider = (language: string, provider: QuerySuggestionGetFn): void => {
    if (language && provider && this.autocompleteConfig.querySuggestions.enabled) {
      this.querySuggestionProviders.set(language, provider);
    }
  };

  private getQuerySuggestions: QuerySuggestionGetFn = (args) => {
    const { language } = args;
    const provider = this.querySuggestionProviders.get(language);

    if (provider) {
      return provider(args);
    }
  };

  private hasQuerySuggestions = (language: string) => this.querySuggestionProviders.has(language);

  /** @public **/
  public setup(core: CoreSetup, { timefilter }: { timefilter: TimefilterSetup }) {
    this.getValueSuggestions = this.autocompleteConfig.valueSuggestions.enabled
      ? setupValueSuggestionProvider(core, { timefilter })
      : getEmptyValueSuggestions;

    return {
      addQuerySuggestionProvider: this.addQuerySuggestionProvider,

      /** @obsolete **/
      /** please use "getProvider" only from the start contract **/
      getQuerySuggestions: this.getQuerySuggestions,
    };
  }

  /** @public **/
  public start() {
    return {
      getQuerySuggestions: this.getQuerySuggestions,
      hasQuerySuggestions: this.hasQuerySuggestions,
      getValueSuggestions: this.getValueSuggestions!,
    };
  }

  /** @internal **/
  public clearProviders(): void {
    this.querySuggestionProviders.clear();
  }
}

/** @public **/
export type AutocompleteSetup = ReturnType<AutocompleteService['setup']>;

/** @public **/
export type AutocompleteStart = ReturnType<AutocompleteService['start']>;
