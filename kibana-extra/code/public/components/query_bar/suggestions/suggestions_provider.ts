/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutocompleteSuggestionGroup, AutocompleteSuggestionType } from '.';

export interface SuggestionsProvider {
  getSuggestions(query: string): Promise<AutocompleteSuggestionGroup>;
}

export abstract class AbstractSuggestionsProvider implements SuggestionsProvider {
  protected MAX_SUGGESTIONS_PER_GROUP = 5;

  public async getSuggestions(_: string): Promise<AutocompleteSuggestionGroup> {
    // This is an abstract class. Do nothing here. You should override this.
    return new Promise<AutocompleteSuggestionGroup>((resolve, reject) => {
      resolve({
        type: AutocompleteSuggestionType.SYMBOL,
        total: 0,
        suggestions: [],
      });
    });
  }
}
