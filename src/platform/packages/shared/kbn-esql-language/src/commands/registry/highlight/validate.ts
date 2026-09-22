/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunctionExpression, isMap, isStringLiteral } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAst,
  ESQLAstHighlightCommand,
  ESQLAstItem,
} from '@elastic/esql/types';
import type { ESQLMessage } from '../../definitions/types';
import { FULL_TEXT_SEARCH_DEFINITIONS } from '../../definitions/constants';
import { getExpressionType } from '../../definitions/utils/expressions';
import { getMessageFromId } from '../../definitions/utils/errors';
import { validateCommandArguments } from '../../definitions/utils/validation';
import { validateMap } from '../../definitions/utils/validation/map';
import type { ICommandContext, ICommandCallbacks } from '../types';
import { HIGHLIGHT_PREFIX_KEYWORD, getPrefixKeyword } from './utils';

// `pre_tags`/`post_tags` accept `keyword | keyword[]`; using type=[keyword] still validates
// list values because getExpressionType delegates a list's type to its first element.
const HIGHLIGHT_MAP_DEFINITION =
  "{name='analyzer', description='Analyzer used to re-analyze the ON fields before highlighting', type=[keyword]}" +
  "{name='pre_tags', description='HTML tag to insert before highlighted text', type=[keyword]}" +
  "{name='post_tags', description='HTML tag to insert after highlighted text', type=[keyword]}" +
  "{name='number_of_fragments', description='Maximum number of fragments to return', type=[integer]}" +
  "{name='fragment_size', description='Size of each fragment in characters', type=[integer]}" +
  "{name='encoder', values=[default, html], description='Encoding for highlighted text', type=[keyword]}" +
  "{name='boundary_scanner', values=[sentence, word], description='How to split fragments', type=[keyword]}" +
  "{name='boundary_scanner_locale', description='Locale for boundary scanning', type=[keyword]}" +
  "{name='order', values=[none, score], description='Order of fragments', type=[keyword]}" +
  "{name='no_match_size', description='Characters to return when there is no match', type=[integer]}" +
  "{name='max_analyzed_offset', description='Maximum character offset to analyze', type=[integer]}";

/**
 * Field types accepted by ES for the HIGHLIGHT ON list. `param` and `unknown` cannot be
 * resolved at validation time, so they are let through.
 */
const ALLOWED_HIGHLIGHT_FIELD_TYPES = ['text', 'keyword', 'param', 'unknown'];

/** Types reported to the user when an ON field is rejected. */
const SUPPORTED_HIGHLIGHT_FIELD_TYPES = 'text or keyword';

/** Boolean operators that may combine full-text queries. */
const BOOLEAN_QUERY_OPERATORS = ['and', 'or', 'not'];

/**
 * Returns the first node that Elasticsearch would reject as a HIGHLIGHT query, or undefined when
 * the whole expression is valid. Valid shapes are a string literal, a full-text function
 * (including the `:` operator), and AND/OR/NOT combinations of those — mirroring
 * `HighlightQueryBuilders.verifyQueryStructure`.
 */
const findInvalidQueryNode = (expression: ESQLAstItem): ESQLAstItem | undefined => {
  if (Array.isArray(expression)) {
    return expression.map(findInvalidQueryNode).find(Boolean);
  }

  if (isStringLiteral(expression)) {
    return undefined;
  }

  if (!isFunctionExpression(expression)) {
    return expression;
  }

  const functionName = expression.name.toLowerCase();

  if (BOOLEAN_QUERY_OPERATORS.includes(functionName)) {
    return expression.args.map(findInvalidQueryNode).find(Boolean);
  }

  return FULL_TEXT_SEARCH_DEFINITIONS.includes(functionName) ? undefined : expression;
};

export const validate = (
  command: ESQLAstAllCommands,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const highlightCommand = command as ESQLAstHighlightCommand;
  const { highlightFields, namedParameters, queryExpression } = highlightCommand;

  // ES rejects any modifier keyword other than `prefix`, so the assignment is only a valid
  // prefix clause when the left-hand identifier matches.
  const prefixKeyword = getPrefixKeyword(highlightCommand);

  if (
    prefixKeyword !== undefined &&
    prefixKeyword.name.toLowerCase() !== HIGHLIGHT_PREFIX_KEYWORD
  ) {
    messages.push(
      getMessageFromId({
        messageId: 'highlightInvalidPrefixModifier',
        values: { keyword: prefixKeyword.name },
        locations: prefixKeyword.location,
      })
    );
  }

  const invalidQueryNode = queryExpression ? findInvalidQueryNode(queryExpression) : undefined;

  // A disallowed *function* is already reported by the shared location check
  // ("Function X not allowed in HIGHLIGHT"), so only report the shapes it cannot see.
  if (
    invalidQueryNode !== undefined &&
    !Array.isArray(invalidQueryNode) &&
    !isFunctionExpression(invalidQueryNode)
  ) {
    messages.push(
      getMessageFromId({
        messageId: 'highlightInvalidQueryExpression',
        values: { expression: invalidQueryNode.text },
        locations: invalidQueryNode.location,
      })
    );
  }

  // ON is mandatory in the grammar; the parser leaves highlightFields undefined when it is absent.
  if (highlightFields === undefined) {
    messages.push(
      getMessageFromId({
        messageId: 'highlightMissingOnClause',
        values: {},
        locations: command.location,
      })
    );
  }

  // Validate ON field types: each field must be text or keyword.
  for (const field of highlightFields ?? []) {
    const fieldType = getExpressionType(field, context?.columns, context?.unmappedFieldsStrategy);

    if (!ALLOWED_HIGHLIGHT_FIELD_TYPES.includes(fieldType)) {
      messages.push(
        getMessageFromId({
          messageId: 'unsupportedColumnTypeForCommand',
          values: {
            command: 'HIGHLIGHT',
            type: SUPPORTED_HIGHLIGHT_FIELD_TYPES,
            givenType: fieldType,
            column: field.name,
          },
          locations: field.location,
        })
      );
    }
  }

  if (namedParameters !== undefined && !Array.isArray(namedParameters) && isMap(namedParameters)) {
    const mapError = validateMap(namedParameters, HIGHLIGHT_MAP_DEFINITION);
    if (mapError) {
      messages.push(mapError);
    }
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  return messages;
};
