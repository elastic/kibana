/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fromKueryExpression } from '@kbn/es-query';
import { flatten, uniqBy } from 'lodash';
import type { $Keys } from 'utility-types';
import type { CoreSetup } from '../../../../../../core/public/types';
import type { DataPublicPluginStart } from '../../../types';
import type {
  QuerySuggestion,
  QuerySuggestionGetFn,
  QuerySuggestionGetFnArgs,
} from '../query_suggestion_provider';
import { setupGetConjunctionSuggestions } from './conjunction';
import { setupGetFieldSuggestions } from './field';
import { setupGetOperatorSuggestions } from './operator';
import { setupGetValueSuggestions } from './value';

const cursorSymbol = '@kuery-cursor@';

const dedup = (suggestions: QuerySuggestion[]): QuerySuggestion[] =>
  uniqBy(suggestions, ({ type, text, start, end }) => [type, text, start, end].join('|'));

export const KUERY_LANGUAGE_NAME = 'kuery';

export const setupKqlQuerySuggestionProvider = (
  core: CoreSetup<object, DataPublicPluginStart>
): QuerySuggestionGetFn => {
  const providers = {
    field: setupGetFieldSuggestions(core),
    value: setupGetValueSuggestions(core),
    operator: setupGetOperatorSuggestions(core),
    conjunction: setupGetConjunctionSuggestions(core),
  };

  const getSuggestionsByType = (
    cursoredQuery: string,
    querySuggestionsArgs: QuerySuggestionGetFnArgs
  ): Array<Promise<QuerySuggestion[]>> | [] => {
    try {
      const cursorNode = fromKueryExpression(cursoredQuery, {
        cursorSymbol,
        parseCursor: true,
      });

      return cursorNode.suggestionTypes.map((type: $Keys<typeof providers>) =>
        providers[type](querySuggestionsArgs, cursorNode)
      );
    } catch (e) {
      return [];
    }
  };

  return (querySuggestionsArgs) => {
    const { query, selectionStart, selectionEnd } = querySuggestionsArgs;
    const cursoredQuery = `${query.substr(0, selectionStart)}${cursorSymbol}${query.substr(
      selectionEnd
    )}`;

    return Promise.all(
      getSuggestionsByType(cursoredQuery, querySuggestionsArgs)
    ).then((suggestionsByType) => dedup(flatten(suggestionsByType)));
  };
};
