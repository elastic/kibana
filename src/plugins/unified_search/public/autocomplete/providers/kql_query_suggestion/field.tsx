/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flatten } from 'lodash';
import { escapeKuery } from './lib/escape_kuery';
import { sortPrefixFirst } from './sort_prefix_first';
import { IFieldType, indexPatterns as dataViewsUtils } from '../../../../../data/public';
import { QuerySuggestionField, QuerySuggestionTypes } from '../../index';
import { KqlQuerySuggestionProvider } from './types';

const keywordComparator = (first: IFieldType, second: IFieldType) => {
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
  return ({ indexPatterns: dataViews }, { start, end, prefix, suffix, nestedPath = '' }) => {
    const allFields = flatten(
      dataViews.map((dataView) => {
        return dataView.fields.filter(dataViewsUtils.isFilterable);
      })
    );
    const search = `${prefix}${suffix}`.trim().toLowerCase();
    const matchingFields = allFields.filter((field) => {
      const subTypeNested = dataViewsUtils.getFieldSubtypeNested(field);
      return (
        (!nestedPath || (nestedPath && subTypeNested?.nested.path.includes(nestedPath))) &&
        field.name.toLowerCase().includes(search)
      );
    });
    const sortedFields = sortPrefixFirst(matchingFields.sort(keywordComparator), search, 'name');

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
