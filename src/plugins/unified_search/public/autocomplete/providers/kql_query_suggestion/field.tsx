/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  return async ({ indexPatterns }, { start, end, prefix, suffix, nestedPath = '' }) => {
    const allFields = flatten(
      indexPatterns.map((indexPattern) => {
        return indexPattern.fields.filter(indexPatternsUtils.isFilterable);
      })
      // temp until IIndexPattern => DataView
    ) as DataViewField[];
    const search = `${prefix}${suffix}`.trim().toLowerCase();
    const matchingFields = allFields.filter((field) => {
      const subTypeNested = indexPatternsUtils.getFieldSubtypeNested(field);
      return (
        (!nestedPath || (nestedPath && subTypeNested?.nested.path.includes(nestedPath))) &&
        field.name.toLowerCase().includes(search)
      );
    });
    const sortedFields = sortPrefixFirst(matchingFields.sort(keywordComparator), search, 'name');
    const { escapeKuery } = await import('@kbn/es-query');
    const suggestions: QuerySuggestionField[] = sortedFields.map((field) => {
      const remainingPath =
        field.subType && field.subType.nested
          ? field.subType.nested.path.slice(nestedPath ? nestedPath.length + 1 : 0)
          : '';
      const text =
        field.subType && field.subType.nested && remainingPath.length > 0
          ? `${escapeKuery(remainingPath)}:{ ${escapeKuery(
              field.name.slice(field.subType.nested.path.length + 1)
            )}  }`
          : `${escapeKuery(field.name.slice(nestedPath ? nestedPath.length + 1 : 0))} `;
      const cursorIndex =
        field.subType && field.subType.nested && remainingPath.length > 0
          ? text.length - 2
          : text.length;

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
