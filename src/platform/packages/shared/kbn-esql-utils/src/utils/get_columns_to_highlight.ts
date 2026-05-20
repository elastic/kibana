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

/**
 * Returns column names produced by TOP_SNIPPETS calls that enable snippet highlighting.
 * These columns may contain highlight markup and need special formatting in the UI.
 */
export function getColumnsToHighlight(query: string): Set<string> {
  const columnsToHighlight = new Set<string>();
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
    if (columnName) {
      columnsToHighlight.add(columnName);
    }
  }

  return columnsToHighlight;
}

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

  return;
};
