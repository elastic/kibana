/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, PluginInitializerContext } from 'src/core/public';
import moment from 'moment';
import type { TimefilterSetup } from '../../../data/public';
import { QuerySuggestionGetFn } from './providers/query_suggestion_provider';
import {
  getEmptyValueSuggestions,
  setupValueSuggestionProvider,
} from './providers/value_suggestion_provider';
import type { ValueSuggestionsGetFn } from './providers/value_suggestion_provider';

import { ConfigSchema } from '../../config';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { createUsageCollector } from './collectors';
import {
  KUERY_LANGUAGE_NAME,
  setupKqlQuerySuggestionProvider,
} from './providers/kql_query_suggestion';
import { UnifiedSearchPublicPluginStart, UnifiedSearchStartDependencies } from '../types';

export class AutocompleteService {
  autocompleteConfig: ConfigSchema['autocomplete'];

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {
    const { autocomplete } = initializerContext.config.get<ConfigSchema>();

    this.autocompleteConfig = autocomplete;
  }

  private readonly querySuggestionProviders: Map<string, QuerySuggestionGetFn> = new Map();
  private getValueSuggestions?: ValueSuggestionsGetFn;

  private getQuerySuggestions: QuerySuggestionGetFn = (args) => {
    const { language } = args;
    const provider = this.querySuggestionProviders.get(language);

    if (provider) {
      return provider(args);
    }
  };

  private hasQuerySuggestions = (language: string) => this.querySuggestionProviders.has(language);

  /** @public **/
  public setup(
    core: CoreSetup<UnifiedSearchStartDependencies, UnifiedSearchPublicPluginStart>,
    {
      timefilter,
      usageCollection,
    }: { timefilter: TimefilterSetup; usageCollection?: UsageCollectionSetup }
  ) {
    const { autocomplete } = this.initializerContext.config.get<ConfigSchema>();
    const { terminateAfter, timeout } = autocomplete.valueSuggestions;
    const usageCollector = createUsageCollector(core.getStartServices, usageCollection);

    this.getValueSuggestions = this.autocompleteConfig.valueSuggestions.enabled
      ? setupValueSuggestionProvider(core, { timefilter, usageCollector })
      : getEmptyValueSuggestions;

    if (this.autocompleteConfig.querySuggestions.enabled) {
      this.querySuggestionProviders.set(KUERY_LANGUAGE_NAME, setupKqlQuerySuggestionProvider(core));
    }

    return {
      /**
       * @deprecated
       * please use "getQuerySuggestions" from the start contract
       */
      getQuerySuggestions: this.getQuerySuggestions,
      getAutocompleteSettings: () => ({
        terminateAfter: moment.duration(terminateAfter).asMilliseconds(),
        timeout: moment.duration(timeout).asMilliseconds(),
      }),
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
