/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isAssignment,
  isBooleanLiteral,
  isColumn,
  isStringLiteral,
  LeafPrinter,
  Parser,
  Walker,
} from '@elastic/esql';
import type { ESQLAstQueryExpression, ESQLFunction, ESQLMapEntry } from '@elastic/esql/types';

const TOP_SNIPPETS_FUNCTION_NAME = 'top_snippets';
const HIGHLIGHT_OPTION_NAME = 'highlight';
const PRE_TAG_OPTION_NAME = 'pre_tag';
const POST_TAG_OPTION_NAME = 'post_tag';

export const DEFAULT_HIGHLIGHT_PRE_TAG = '<em>';
export const DEFAULT_HIGHLIGHT_POST_TAG = '</em>';

export interface EsqlColumnHighlight {
  column: string;
  preTag: string;
  postTag: string;
}

/**
 * Returns columns produced by TOP_SNIPPETS calls that enable snippet highlighting,
 * including the opening and closing markup tags configured for each column.
 */
export function getColumnsWithHighlights(query: string): EsqlColumnHighlight[] {
  const columnsWithHighlights = new Map<string, EsqlColumnHighlight>();
  const { root } = Parser.parse(query);

  const topSnippetFunctions = Walker.matchAll(root, {
    type: 'function',
    name: TOP_SNIPPETS_FUNCTION_NAME,
  });

  for (const topSnippetsFunction of topSnippetFunctions) {
    const fn = topSnippetsFunction as ESQLFunction;

    if (!isHighlightEnabled(fn)) {
      continue;
    }

    const columnName = getColumnNameForTopSnippetsFunction(root, fn);
    if (!columnName) {
      continue;
    }

    const { preTag, postTag } = getHighlightTags(fn);
    columnsWithHighlights.set(columnName, { column: columnName, preTag, postTag });
  }

  return Array.from(columnsWithHighlights.values());
}

const getMapOptionString = (
  topSnippetsFunction: ESQLFunction,
  optionName: string
): string | undefined => {
  const optionKey = Walker.find(
    topSnippetsFunction,
    (node) => isStringLiteral(node) && node.valueUnquoted === optionName
  );

  if (!optionKey) {
    return undefined;
  }

  const mapEntry = Walker.parent(topSnippetsFunction, optionKey);
  if (mapEntry?.type !== 'map-entry') {
    return undefined;
  }

  const { value } = mapEntry as ESQLMapEntry;

  if (!isStringLiteral(value)) {
    return undefined;
  }

  return value.valueUnquoted ?? value.text;
};

const getHighlightTags = (
  topSnippetsFunction: ESQLFunction
): Pick<EsqlColumnHighlight, 'preTag' | 'postTag'> => ({
  preTag: getMapOptionString(topSnippetsFunction, PRE_TAG_OPTION_NAME) ?? DEFAULT_HIGHLIGHT_PRE_TAG,
  postTag:
    getMapOptionString(topSnippetsFunction, POST_TAG_OPTION_NAME) ?? DEFAULT_HIGHLIGHT_POST_TAG,
});

const isHighlightEnabled = (topSnippetsFunction: ESQLFunction): boolean => {
  const highlightKey = Walker.find(
    topSnippetsFunction,
    (node) => isStringLiteral(node) && node.valueUnquoted === HIGHLIGHT_OPTION_NAME
  );
  if (!highlightKey) {
    return false;
  }

  const mapEntry = Walker.parent(topSnippetsFunction, highlightKey);
  if (mapEntry?.type !== 'map-entry') {
    return false;
  }

  const { value } = mapEntry as ESQLMapEntry;

  return isBooleanLiteral(value) && value.value === 'true';
};

const getColumnNameForTopSnippetsFunction = (
  root: ESQLAstQueryExpression,
  topSnippetsFunction: ESQLFunction
): string | undefined => {
  for (const parent of Walker.parents(root, topSnippetsFunction)) {
    if (isAssignment(parent) && isColumn(parent.args[0])) {
      return LeafPrinter.column(parent.args[0]);
    }
  }

  return undefined;
};
