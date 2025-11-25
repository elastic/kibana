/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@kbn/esql-ast';
import { ESQL_VARIABLES_PREFIX } from '@kbn/esql-ast';
import type { ESQLColumnData, GetColumnsByTypeFn } from '@kbn/esql-ast/src/commands_registry/types';
import { buildFieldsDefinitionsWithMetadata } from '@kbn/esql-ast/src/definitions/utils';
import { QueryColumns } from './resources_helpers';
import type { ESQLCallbacks } from './types';

export type ColumnsMap = Map<string, ESQLColumnData>;
export type GetColumnMapFn = () => Promise<ColumnsMap>;

export function getColumnsByTypeRetriever(
  query: ESQLAstQueryExpression,
  queryText: string,
  resourceRetriever?: ESQLCallbacks
): { getColumnsByType: GetColumnsByTypeFn; getColumnMap: GetColumnMapFn } {
  const helpers = new QueryColumns(query, queryText, resourceRetriever);
  const getVariables = resourceRetriever?.getVariables;
  const canSuggestVariables = resourceRetriever?.canSuggestVariables?.() ?? false;

  const queryString = queryText;
  const lastCharacterTyped = queryString[queryString.length - 1];
  const lastCharIsQuestionMark = lastCharacterTyped === ESQL_VARIABLES_PREFIX;
  return {
    getColumnsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = [],
      options
    ) => {
      const updatedOptions = {
        ...options,
        supportsControls: canSuggestVariables && !lastCharIsQuestionMark,
      };
      const editorExtensions = (await resourceRetriever?.getEditorExtensions?.(queryText)) ?? {
        recommendedQueries: [],
        recommendedFields: [],
      };
      const recommendedFieldsFromExtensions = editorExtensions.recommendedFields;
      const columns = await helpers.byType(expectedType, ignored);
      return buildFieldsDefinitionsWithMetadata(
        columns,
        recommendedFieldsFromExtensions,
        updatedOptions,
        await getVariables?.()
      );
    },
    getColumnMap: helpers.asMap.bind(helpers),
  };
}
