/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { indexPatterns as indexPatternsUtils } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { flatten } from 'lodash';
import { sortPrefixFirst } from './sort_prefix_first';
import { QuerySuggestionField, QuerySuggestionTypes } from '../query_suggestion_provider';
import { KqlQuerySuggestionProvider } from './types';

const keywordComparator = (first: DataViewField, second: DataViewField) => {
  const extensions = ['raw', 'keyword'];
  if (extensions.map((ext) => `${first.name}.${ext}`).includes(second.name)) {
    return 1;
  } else if (extensions.map((ext) => `${second.name}.${ext}`).includes(first.name)) {
    return -1;
  }

  return first.name.localeCompare(second.name);
};

export const setupGetFieldSuggestions: KqlQuerySuggestionProvider<QuerySuggestionField> = (
  core
) => {
  return async (
    { indexPatterns, suggestionsAbstraction },
    { start, end, prefix, suffix, nestedPath = '' }
  ) => {
    const allFields = flatten(
      indexPatterns.map((indexPattern) => {
        return indexPattern.fields.filter(indexPatternsUtils.isFilterable);
      })
      // temp until IIndexPattern => DataView
    ) as DataViewField[];
    const search = `${prefix}${suffix}`.trim().toLowerCase();
    const matchingFields = allFields.filter((field) => {
      const subTypeNested = indexPatternsUtils.getFieldSubtypeNested(field);
      if (suggestionsAbstraction?.fields?.[field.name]) {
        return (
          (!nestedPath || (nestedPath && subTypeNested?.nested.path.includes(nestedPath))) &&
          (suggestionsAbstraction?.fields[field.name]?.displayField ?? '')
            .toLowerCase()
            .includes(search)
        );
      } else {
        return (
          (!nestedPath || (nestedPath && subTypeNested?.nested.path.includes(nestedPath))) &&
          field.name.toLowerCase().includes(search)
        );
      }
    });
    const sortedFields = sortPrefixFirst(matchingFields.sort(keywordComparator), search, 'name');
    const { escapeKuery } = await import('@kbn/es-query');
    const suggestions: QuerySuggestionField[] = sortedFields.map((field) => {
      const isNested = field.subType && field.subType.nested;
      const isSuggestionsAbstractionOn = !!suggestionsAbstraction?.fields?.[field.name];

      const remainingPath =
        field.subType && field.subType.nested
          ? isSuggestionsAbstractionOn
            ? (suggestionsAbstraction?.fields[field.name].displayField ?? '').slice(
                nestedPath ? nestedPath.length + 1 : 0
              )
            : field.subType.nested.path.slice(nestedPath ? nestedPath.length + 1 : 0)
          : '';
      let text =
        isNested && remainingPath.length > 0
          ? `${escapeKuery(remainingPath)}:{ ${escapeKuery(
              field.name.slice(field.subType.nested.path.length + 1)
            )}  }`
          : `${escapeKuery(field.name.slice(nestedPath ? nestedPath.length + 1 : 0))} `;

      if (isSuggestionsAbstractionOn) {
        if (isNested && remainingPath.length > 0) {
          text = `${escapeKuery(remainingPath)}:{ ${escapeKuery(
            suggestionsAbstraction?.fields[field.name]?.nestedDisplayField ?? ''
          )}  }`;
        } else if (isNested && remainingPath.length === 0) {
          text = suggestionsAbstraction?.fields[field.name]?.nestedDisplayField ?? '';
        } else {
          text = suggestionsAbstraction?.fields[field.name].displayField ?? '';
        }
      }

      const cursorIndex = isNested && remainingPath.length > 0 ? text.length - 2 : text.length;

      return {
        type: QuerySuggestionTypes.Field,
        text,
        start,
        end,
        cursorIndex,
        field,
      };
    });

    return Promise.resolve(suggestions);
  };
};
