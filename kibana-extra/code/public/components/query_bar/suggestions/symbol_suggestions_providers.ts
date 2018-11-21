/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@code/lsp-extension';
import { kfetch } from 'ui/kfetch';
import { Location } from 'vscode-languageserver';

import { AutocompleteSuggestion, SuggestionsProvider } from '.';
import { RepositoryUtils } from '../../../../common/repository_utils';

export class SymbolSuggestionsProvider implements SuggestionsProvider {
  public async getSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    const res = await kfetch({
      pathname: `../api/code/suggestions/symbol`,
      method: 'get',
      query: { q: query },
    });
    return Array.from(res.symbols)
      .slice(0, 5)
      .map((symbol: DetailSymbolInformation) => {
        return {
          description: symbol.qname,
          end: 10,
          start: 1,
          text: symbol.symbolInformation.name,
          type: symbol.symbolInformation.kind,
          selectUrl: this.getSymbolLinkUrl(symbol.symbolInformation.location),
        };
      });
  }

  private getSymbolLinkUrl(location: Location) {
    // TODO(mengwei): pending on #604;
    try {
      return RepositoryUtils.locationToUrl(location);
    } catch (error) {
      return '';
    }
  }
}
