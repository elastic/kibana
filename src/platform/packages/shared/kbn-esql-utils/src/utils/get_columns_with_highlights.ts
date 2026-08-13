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
  isMap,
  isStringLiteral,
  LeafPrinter,
  Parser,
  Walker,
} from '@elastic/esql';

import type { ESQLAstQueryExpression, ESQLFunction, ESQLMap } from '@elastic/esql/types';
import { replaceColumnNamesIfRenamed } from './query_parsing_helpers';

export const DEFAULT_HIGHLIGHT_PRE_TAG = '<em>';
export const DEFAULT_HIGHLIGHT_POST_TAG = '</em>';

const HIGHLIGHT_OPTION_NAME = 'highlight';
const PRE_TAG_OPTION_NAME = 'pre_tag';
const POST_TAG_OPTION_NAME = 'post_tag';

/**
 * ES|QL functions that can produce highlight markup in output columns when
 * called with `{ "highlight": true }`.
 */
const FUNCTIONS_WITH_HIGHLIGHT_SUPPORT = ['top_snippets'];

export interface ESQLHighlightTags {
  preTag: string;
  postTag: string;
}

export type ESQLColumnsWithHighlights = Record<string, ESQLHighlightTags>;

/**
 * Returns columns built using a highlighting algorithm,
 * including the opening and closing markup tags configured for each column.
 *
 * Example:
 * ```
 * FROM books
 *  | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true })
 *  | EVAL titles = TOP_SNIPPETS(title, "Tolkien", { "highlight": true, "pre_tag": "<mark>", "post_tag": "</mark>" })
 * ```
 * Will return the following map:
 * ```
 * {
 *   snippets: {
 *     preTag: '<em>',
 *     postTag: '</em>',
 *   },
 *   titles: {
 *     preTag: '<mark>',
 *     postTag: '</mark>',
 *   },
 * }
 */
export function getColumnsWithHighlights(query: string): ESQLColumnsWithHighlights {
  const columnsWithHighlights: ESQLColumnsWithHighlights = {};
  const { root } = Parser.parse(query);

  const highlightFunctionsCandidates = Walker.findAll(
    root,
    (node) => node.type === 'function' && FUNCTIONS_WITH_HIGHLIGHT_SUPPORT.includes(node.name)
  ) as ESQLFunction[];

  for (const fn of highlightFunctionsCandidates) {
    const optionsMap = fn.args.find(isMap);

    if (!optionsMap || !isHighlightEnabled(optionsMap)) {
      continue;
    }

    const columnName = getHighlightedColumnName(root, fn, query);
    if (!columnName) {
      continue;
    }

    const preTag =
      getHighlightTagName(optionsMap, PRE_TAG_OPTION_NAME) ?? DEFAULT_HIGHLIGHT_PRE_TAG;
    const postTag =
      getHighlightTagName(optionsMap, POST_TAG_OPTION_NAME) ?? DEFAULT_HIGHLIGHT_POST_TAG;

    // Check if the column name has been renamed in the query
    const [resolvedColumnName] = replaceColumnNamesIfRenamed(root, [columnName]);

    columnsWithHighlights[resolvedColumnName] = {
      preTag,
      postTag,
    };
  }

  return columnsWithHighlights;
}

/**
 * Given a map of options, returns true if the `highlight` option is set to `true`.
 */
const isHighlightEnabled = (optionsMap: ESQLMap): boolean => {
  const highlightEntry = optionsMap.entries.find(
    (entry) => isStringLiteral(entry.key) && entry.key.valueUnquoted === HIGHLIGHT_OPTION_NAME
  );
  if (!highlightEntry?.value) {
    return false;
  }

  return (
    isBooleanLiteral(highlightEntry.value) && highlightEntry.value.value.toLowerCase() === 'true'
  );
};

/**
 * Returns the tag name defined in the map options if it exists.
 */
const getHighlightTagName = (optionsMap: ESQLMap, optionName: string): string | undefined => {
  const tagEntry = optionsMap.entries.find(
    (entry) => isStringLiteral(entry.key) && entry.key.valueUnquoted === optionName
  );

  if (!tagEntry?.value) {
    return undefined;
  }
  if (!isStringLiteral(tagEntry.value)) {
    return undefined;
  }
  return tagEntry.value.valueUnquoted;
};

/**
 * Returns the name of the column that was created using the highlight function.
 *
 * This function has an heuristic part, some combination of function could remove the highlighting tokens from the result.
 * But it assumes that if the user used highlight:true, it's not interested in removing them.
 * Doing a 100% accurate check would involve knowing the semantics of every invoked function.
 * In the worst case of having a false positive, a value without highlighting tags will run through the highlighitng code.
 */
const getHighlightedColumnName = (
  root: ESQLAstQueryExpression,
  highlightFunction: ESQLFunction,
  query: string
): string | undefined => {
  // Created using an assignment | EVAL col = TOP_SNIPPETS( ...
  for (const parent of Walker.parents(root, highlightFunction)) {
    if (isAssignment(parent) && isColumn(parent.args[0])) {
      return LeafPrinter.column(parent.args[0]);
    }
  }

  // Created using an expression text | EVAL TOP_SNIPPETS( ... or STATS count(*) BY TOP_SNIPPETS( ...
  return query.substring(highlightFunction.location.min, highlightFunction.location.max + 1);
};
