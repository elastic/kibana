/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';

import {
  AbstractSuggestionsProvider,
  AutocompleteSuggestionGroup,
  AutocompleteSuggestionType,
} from '.';
import { Repository } from '../../../../model';

export class RepositorySuggestionsProvider extends AbstractSuggestionsProvider {
  public async getSuggestions(query: string): Promise<AutocompleteSuggestionGroup> {
    const res = await kfetch({
      pathname: `../api/code/suggestions/repo`,
      method: 'get',
      query: { q: query },
    });
    const suggestions = Array.from(res.repositories)
      .slice(0, this.MAX_SUGGESTIONS_PER_GROUP)
      .map((repo: Repository) => {
        return {
          description: repo.url,
          end: 10,
          start: 1,
          text: repo.uri,
          tokenType: 'tokenRepo',
          selectUrl: `/${repo.uri}`,
        };
      });
    return {
      type: AutocompleteSuggestionType.REPOSITORY,
      total: res.total,
      suggestions,
    };
  }
}
