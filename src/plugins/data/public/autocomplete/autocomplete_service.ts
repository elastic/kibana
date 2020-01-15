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
import { QuerySuggestionsGet } from './providers/query_suggestion_provider';
import {
  setupFieldSuggestionProvider,
  FieldSuggestionsGet,
} from './providers/field_suggestion_provider';

export class AutocompleteService {
  private readonly querySuggestionProviders: Map<string, QuerySuggestionsGet> = new Map();
  private getFieldSuggestions?: FieldSuggestionsGet;

  private addQuerySuggestionProvider = (language: string, provider: QuerySuggestionsGet): void => {
    if (language && provider) {
      this.querySuggestionProviders.set(language, provider);
    }
  };

  private getQuerySuggestions: QuerySuggestionsGet = args => {
    const { language } = args;
    const provider = this.querySuggestionProviders.get(language);

    if (provider) {
      return provider(args);
    }
  };

  private hasQuerySuggestions = (language: string) => this.querySuggestionProviders.has(language);

  /** @public **/
  public setup(core: CoreSetup) {
    this.getFieldSuggestions = setupFieldSuggestionProvider(core);

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
      getFieldSuggestions: this.getFieldSuggestions!,
    };
  }

  /** @internal **/
  public clearProviders(): void {
    this.querySuggestionProviders.clear();
  }
}
