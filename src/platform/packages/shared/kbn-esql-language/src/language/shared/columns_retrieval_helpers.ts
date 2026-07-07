/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCallbacks, RecommendedField } from '@kbn/esql-types';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import { ESQL_VARIABLES_PREFIX } from '../../commands/registry/constants';
import type { ESQLColumnData, GetColumnsByTypeFn } from '../../commands/registry/types';
import { buildFieldsDefinitionsWithMetadata } from '../../commands/definitions/utils';
import { QueryColumns } from '../../query_columns_service';

export type ColumnsMap = Map<string, ESQLColumnData>;
export type GetColumnMapFn = () => Promise<ColumnsMap>;

const defaultExtensions: { recommendedFields: RecommendedField[] } = {
  recommendedFields: [],
};

export function getColumnsByTypeRetriever(
  query: ESQLAstQueryExpression,
  queryText: string,
  resourceRetriever?: ESQLCallbacks
): { getColumnsByType: GetColumnsByTypeFn; getColumnMap: GetColumnMapFn } {
  const helpers = new QueryColumns(query, queryText, resourceRetriever);
  const getVariables = resourceRetriever?.getVariables;
  const canSuggestVariables = resourceRetriever?.canSuggestVariables?.() ?? false;

  const lastCharacterTyped = queryText[queryText.length - 1];
  const lastCharIsQuestionMark = lastCharacterTyped === ESQL_VARIABLES_PREFIX;

  let extensionsPromise: Promise<{ recommendedFields: RecommendedField[] }> | undefined;
  const getExtensionsOnce = () => {
    if (!extensionsPromise) {
      extensionsPromise =
        resourceRetriever
          ?.getEditorExtensions?.(queryText)
          .then((result) => result ?? defaultExtensions)
          .catch(() => defaultExtensions) ?? Promise.resolve(defaultExtensions);
    }
    return extensionsPromise;
  };

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
      const editorExtensions = await getExtensionsOnce();
      const columns = await helpers.byType(expectedType, ignored);
      return buildFieldsDefinitionsWithMetadata(
        columns,
        editorExtensions.recommendedFields,
        updatedOptions,
        await getVariables?.()
      );
    },
    getColumnMap: helpers.asMap.bind(helpers),
  };
}
