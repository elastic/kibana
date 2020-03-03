/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreSetup } from 'src/core/public';
import { QuerySuggestionGetFn } from './providers/query_suggestion_provider';
import {
  setupValueSuggestionProvider,
  ValueSuggestionsGetFn,
} from './providers/value_suggestion_provider';

export class AutocompleteService {
  private readonly querySuggestionProviders: Map<string, QuerySuggestionGetFn> = new Map();
  private getValueSuggestions?: ValueSuggestionsGetFn;

  private addQuerySuggestionProvider = (language: string, provider: QuerySuggestionGetFn): void => {
    if (language && provider) {
      this.querySuggestionProviders.set(language, provider);
    }
  };

  private getQuerySuggestions: QuerySuggestionGetFn = args => {
    const { language } = args;
    const provider = this.querySuggestionProviders.get(language);

    if (provider) {
      return provider(args);
    }
  };

  private hasQuerySuggestions = (language: string) => this.querySuggestionProviders.has(language);

  /** @public **/
  public setup(core: CoreSetup) {
    this.getValueSuggestions = setupValueSuggestionProvider(core);

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
